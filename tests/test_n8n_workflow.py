"""Validation tests for the n8n Argus workflow JSON definition."""
import json
import unittest
from pathlib import Path

WORKFLOW_PATH = Path(__file__).resolve().parent.parent / "n8n" / "argus_workflow.json"


class TestN8nWorkflow(unittest.TestCase):
    """Test suite validating n8n workflow definition and structure."""

    def setUp(self):
        self.assertTrue(WORKFLOW_PATH.exists(), f"Workflow JSON must exist at {WORKFLOW_PATH}")
        with open(WORKFLOW_PATH, "r", encoding="utf-8") as f:
            self.workflow = json.load(f)

    def test_workflow_metadata(self):
        self.assertIn("name", self.workflow)
        self.assertIn("Argus", self.workflow["name"])
        self.assertIn("nodes", self.workflow)
        self.assertIn("connections", self.workflow)
        self.assertGreater(len(self.workflow["nodes"]), 4)

    def test_required_nodes_exist(self):
        node_types = [node.get("type") for node in self.workflow["nodes"]]
        node_names = [node.get("name") for node in self.workflow["nodes"]]

        # Verify essential node types are configured
        self.assertIn("n8n-nodes-base.scheduleTrigger", node_types)
        self.assertIn("n8n-nodes-base.httpRequest", node_types)
        self.assertIn("n8n-nodes-base.postgres", node_types)
        self.assertIn("n8n-nodes-base.if", node_types)
        self.assertIn("n8n-nodes-base.code", node_types)
        self.assertIn("n8n-nodes-base.emailSend", node_types)

        # Verify exact node names matching the single digest architecture
        self.assertIn("Schedule Trigger", node_names)
        self.assertIn("HTTP Request", node_names)
        self.assertIn("PostgreSQL", node_names)
        self.assertIn("IF", node_names)
        self.assertIn("Code", node_names)
        self.assertIn("Send Email", node_names)
        self.assertIn("Postgres — Mark Notified", node_names)

    def test_http_request_node_configuration(self):
        http_node = next(n for n in self.workflow["nodes"] if n.get("name") == "HTTP Request")
        self.assertEqual(http_node["parameters"]["method"], "POST")
        self.assertIn("run-ingestion", http_node["parameters"]["url"])

    def test_postgres_query_validity(self):
        postgres_nodes = [n for n in self.workflow["nodes"] if n.get("type") == "n8n-nodes-base.postgres"]
        self.assertGreaterEqual(len(postgres_nodes), 2)

        # Select node should query unnotified postings
        select_node = next(n for n in postgres_nodes if n["name"] == "PostgreSQL")
        query = select_node["parameters"]["query"]
        self.assertIn("FROM postings", query)
        self.assertIn("relevant = true", query)
        self.assertIn("notified_at IS NULL", query)

        # Update node should mark postings as notified with ARRAY[...]
        update_node = next(n for n in postgres_nodes if "Mark" in n["name"])
        update_query = update_node["parameters"]["query"]
        self.assertIn("UPDATE postings", update_query)
        self.assertIn("notified_at = NOW()", update_query)
        self.assertIn("posting_ids", update_query)

    def test_connections_flow_integrity(self):
        connections = self.workflow["connections"]
        nodes_by_name = {n["name"]: n for n in self.workflow["nodes"]}

        for source_node_name, targets in connections.items():
            self.assertIn(source_node_name, nodes_by_name, f"Source node '{source_node_name}' must exist in nodes")
            for conn_type, target_list in targets.items():
                for target_branch in target_list:
                    for target in target_branch:
                        self.assertIn(
                            target["node"],
                            nodes_by_name,
                            f"Target node '{target['node']}' in connection from '{source_node_name}' must exist in nodes",
                        )


if __name__ == "__main__":
    unittest.main()
