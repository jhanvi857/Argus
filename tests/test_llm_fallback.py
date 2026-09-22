"""Unit tests for automatic Groq -> Gemini LLM fallback."""
import unittest
from unittest.mock import patch, MagicMock
import os

from src.graphs.llm_classifier import classify_with_llm, LLMClassificationResult
from src.graphs.matcher_graph import call_llm_for_match


class TestLLMFallback(unittest.TestCase):
    """Test suite verifying that if Groq fails or is unconfigured, Argus switches to Gemini."""

    @patch("src.graphs.llm_classifier.os.getenv")
    def test_classify_with_llm_switches_to_gemini_when_groq_fails(self, mock_getenv):
        """When Groq throws an exception (e.g. invalid key / rate limit), Gemini is called."""
        def fake_getenv(key, default=None):
            if key == "GROQ_API_KEY":
                return "gsk_invalid_test_key"
            if key in ("GEMINI_API_KEY", "GOOGLE_API_KEY"):
                return "AIzaSy_test_gemini_key"
            return default

        mock_getenv.side_effect = fake_getenv

        # Mock ChatGroq to simulate failure
        mock_groq = MagicMock()
        mock_groq.with_structured_output.side_effect = Exception("Groq 401 Unauthorized / Invalid API Key")

        # Mock ChatGoogleGenerativeAI to simulate success
        expected_gemini_result = LLMClassificationResult(
            relevant=True,
            confidence=0.95,
            rationale="Gemini fallback verified this is a relevant SWE internship role",
            detected_level="intern",
            detected_domain="backend"
        )
        mock_gemini_instance = MagicMock()
        mock_gemini_structured = MagicMock()
        mock_gemini_structured.invoke.return_value = expected_gemini_result
        mock_gemini_instance.with_structured_output.return_value = mock_gemini_structured

        with patch("langchain_groq.ChatGroq", return_value=mock_groq), \
             patch("langchain_google_genai.ChatGoogleGenerativeAI", return_value=mock_gemini_instance):

            result = classify_with_llm(
                title="Software Engineering Intern",
                team="Cloud Infrastructure",
                location="Sunnyvale, CA"
            )

            self.assertTrue(result.relevant)
            self.assertEqual(result.detected_level, "intern")
            self.assertIn("Gemini fallback", result.rationale)

    @patch("src.graphs.llm_classifier.os.getenv")
    def test_classify_with_llm_uses_gemini_directly_when_groq_unconfigured(self, mock_getenv):
        """When GROQ_API_KEY is not set, Gemini is invoked directly."""
        def fake_getenv(key, default=None):
            if key == "GROQ_API_KEY":
                return None
            if key in ("GEMINI_API_KEY", "GOOGLE_API_KEY"):
                return "AIzaSy_test_gemini_key"
            return default

        mock_getenv.side_effect = fake_getenv

        expected_gemini_result = LLMClassificationResult(
            relevant=True,
            confidence=0.92,
            rationale="Classified via Gemini",
            detected_level="intern",
            detected_domain="swe"
        )
        mock_gemini_instance = MagicMock()
        mock_gemini_structured = MagicMock()
        mock_gemini_structured.invoke.return_value = expected_gemini_result
        mock_gemini_instance.with_structured_output.return_value = mock_gemini_structured

        with patch("langchain_google_genai.ChatGoogleGenerativeAI", return_value=mock_gemini_instance):
            result = classify_with_llm(
                title="SWE Summer Intern",
                team="Core Systems",
                location="New York, NY"
            )

            self.assertTrue(result.relevant)
            self.assertEqual(result.detected_level, "intern")

    @patch("src.graphs.matcher_graph.os.getenv")
    def test_matcher_switches_to_gemini_when_groq_fails(self, mock_getenv):
        """When Groq fails in matcher graph, Gemini is invoked with OutputFixingParser."""
        def fake_getenv(key, default=None):
            if key == "GROQ_API_KEY":
                return "gsk_bad_key"
            if key in ("GEMINI_API_KEY", "GOOGLE_API_KEY"):
                return "AIzaSy_test_gemini_key"
            if key == "LLM_PROVIDER":
                return "groq"
            return default

        mock_getenv.side_effect = fake_getenv

        # Mock Groq to fail
        mock_groq = MagicMock()
        mock_groq.invoke.side_effect = Exception("Groq rate limit exceeded (429)")

        # Mock Gemini to succeed
        mock_gemini_response = MagicMock()
        mock_gemini_response.content = '{"recommended_project_ids": ["evora", "nioflow"], "rationale": "Strong fit for distributed consensus", "suggested_keywords": ["Go", "Raft"]}'
        mock_gemini_instance = MagicMock()
        mock_gemini_instance.invoke.return_value = mock_gemini_response

        shortlist = [
            {"id": "evora", "name": "Evora", "tech_stack": ["Go", "Raft"]},
            {"id": "nioflow", "name": "NioFlow", "tech_stack": ["Java", "Netty"]},
        ]
        job_data = {"id": 101, "title": "Distributed Systems Engineer"}

        with patch("langchain_groq.ChatGroq", return_value=mock_groq), \
             patch("langchain_google_genai.ChatGoogleGenerativeAI", return_value=mock_gemini_instance):

            result = call_llm_for_match(
                job_data=job_data,
                shortlist=shortlist,
                prompt="Match job to portfolio"
            )

            self.assertEqual(result["recommended_project_ids"], ["evora", "nioflow"])
            self.assertIn("distributed consensus", result["rationale"])


if __name__ == "__main__":
    unittest.main()
