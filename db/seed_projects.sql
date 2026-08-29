-- Argus Seed Portfolio
-- Ground truth candidate project portfolio for LLM JD matching

INSERT INTO projects (id, name, tech_stack, tags, summary, quantified_bullets, resume_variants)
VALUES
(
    'nioflow',
    'NioFlow',
    ARRAY['Java', 'Netty', 'Rust', 'JNI', 'Epoll', 'Zero-Copy', 'RingBuffer'],
    ARRAY['distributed-systems', 'high-throughput', 'networking', 'java', 'rust', 'zero-copy', 'low-latency', 'concurrency'],
    'High-throughput, non-blocking event streaming engine with custom memory pools, zero-copy buffer recycling, and native SIMD packet parsing routines via Rust JNI.',
    ARRAY[
        'Engineered a zero-allocation TCP event streaming server in Java/Netty handling 250k+ req/sec at sub-5ms p99 latency across 10GbE interfaces.',
        'Designed custom off-heap RingBuffer allocators and ByteBuf recycling pools, reducing GC pause overhead by 94% under sustained memory pressure.',
        'Integrated vectorized protocol frame decoding kernels written in Rust via JNI SIMD routines, accelerating packet parsing by 3.4x over standard bitwise decoders.'
    ],
    '{
        "infra_variant": [
            "Architected low-latency off-heap event ringbuffer in Java 21/Netty capable of 250k req/sec at p99 < 5ms.",
            "Eliminated stop-the-world GC pauses through native off-heap memory management and explicit zero-copy buffer slicing.",
            "Benchmarked network performance under saturated 10Gbps load using asynchronous epoll transport pipelines."
        ],
        "backend_variant": [
            "Built resilient asynchronous event broker handling high-throughput client connections with Netty and Rust JNI.",
            "Implemented end-to-end backpressure signaling and connection pooling to prevent downstream service exhaustion."
        ]
    }'::jsonb
),
(
    'evora',
    'Evora',
    ARRAY['Go', 'Raft', 'LSM-Tree', 'gRPC', 'Protobuf', 'WAL', 'SSTables', 'Bloom Filters'],
    ARRAY['distributed-systems', 'storage', 'consensus', 'raft', 'go', 'lsm-tree', 'grpc', 'fault-tolerance'],
    'Distributed linearizable key-value store implementing Multi-Raft consensus algorithm from scratch with a custom LSM-tree storage engine and tiered compaction in Go.',
    ARRAY[
        'Implemented Raft consensus protocol from scratch in Go with dynamic cluster membership changes, heartbeat leases, and snapshotting, sustaining 45k write IOPS per node.',
        'Engineered an embedded Log-Structured Merge-Tree (LSM-tree) storage engine featuring WAL, MemTable, tiered SSTable compaction, and vectorized Bloom filters.',
        'Validated consensus safety and linearizability under network partitions and node crash failures using Jepsen-style fault injection testing with 100% data integrity.'
    ],
    '{
        "distributed_systems_variant": [
            "Implemented Multi-Raft consensus protocol in Go with leader election, log replication, and automated cluster membership changes.",
            "Designed linearizable read-index leases and snapshot transfers, achieving 45k write IOPS per node under continuous load.",
            "Subjected Raft cluster to automated partition and chaos fault injection, validating zero data loss across failovers."
        ],
        "storage_variant": [
            "Engineered custom LSM-Tree storage engine with Write-Ahead Log (WAL), tiered SSTable compaction, and Bloom filters in Go.",
            "Optimized random read latencies by 3.8x using partitioned index blocks and sparse primary key indexing."
        ]
    }'::jsonb
),
(
    'gitresolve',
    'GitResolve',
    ARRAY['C++', 'Python', 'Tree-sitter', 'AST Parsing', 'Git Plumbing', 'SQLite', 'CMake'],
    ARRAY['developer-tools', 'algorithms', 'ast-parsing', 'concurrency', 'cpp', 'python', 'git', 'compilers'],
    'Semantic 3-way code merge and conflict resolution engine that parses language ASTs to resolve non-conflicting syntactic changes and auto-merge multi-developer edits.',
    ARRAY[
        'Developed a semantic 3-way merge engine in C++20 parsing ASTs with Tree-sitter, reducing structural merge conflicts by 68% across 10,000+ benchmark pull requests.',
        'Designed a multi-threaded parallel diffing matrix algorithm in C++ executing semantic analysis over large multi-file repositories in <180ms.',
        'Built a cross-language Python CLI and Git custom merge driver integration supporting Go, C++, Python, TypeScript, and Java syntax trees.'
    ],
    '{
        "systems_variant": [
            "Engineered high-performance AST differential analyzer in C++20 with Tree-sitter, parsing syntax trees concurrently with <180ms latency.",
            "Designed graph reconciliation algorithms to automatically resolve non-interfering code changes across branch divergence points."
        ],
        "devtools_variant": [
            "Created GitResolve custom merge driver reducing merge conflicts by 68% across complex multi-branch enterprise repositories.",
            "Implemented Python developer CLI and automated regression test suite executing against 10k real-world open-source pull requests."
        ]
    }'::jsonb
),
(
    'docstream',
    'DocStream',
    ARRAY['Rust', 'WebAssembly', 'TypeScript', 'WebSockets', 'CRDT', 'Actix-web', 'Tokio'],
    ARRAY['distributed-systems', 'crdt', 'real-time', 'rust', 'websockets', 'typescript', 'concurrency', 'webassembly'],
    'Real-time collaborative document editing engine powered by conflict-free replicated data types (CRDT) compiled to WebAssembly with an asynchronous Rust WebSocket server.',
    ARRAY[
        'Implemented a state-based CRDT text engine in Rust and compiled to WebAssembly, providing zero-latency offline-first local typing and peer-to-peer divergence resolution.',
        'Constructed an asynchronous WebSocket pub/sub broker in Rust/Actix-web handling 50,000 concurrent client streams with sub-15ms end-to-end sync latency.',
        'Formulated a delta-state compression codec reducing peer-to-peer network payload bandwidth by 78% during heavy concurrent keystroke bursts.'
    ],
    '{
        "distributed_systems_variant": [
            "Engineered provably convergent CRDT synchronization engine in Rust, ensuring eventual consistency across distributed clients without central locks.",
            "Scaled asynchronous WebSocket cluster with Tokio/Actix-web handling 50k concurrent document streams at <15ms broadcast latency."
        ],
        "fullstack_variant": [
            "Built full-duplex collaborative editor integrating Rust WebAssembly core with responsive React/TypeScript frontend.",
            "Implemented delta-compression protocol slashing real-time network overhead by 78%."
        ]
    }'::jsonb
),
(
    'cloudweave',
    'CloudWeave',
    ARRAY['Go', 'Kubernetes', 'eBPF', 'Cilium', 'Envoy', 'gRPC', 'Prometheus', 'Docker'],
    ARRAY['cloud-native', 'kubernetes', 'ebpf', 'networking', 'go', 'service-mesh', 'observability', 'infra'],
    'Cloud-native Kubernetes service mesh and traffic controller leveraging eBPF for kernel-level socket bypass, automated canary routing, and L7 telemetry.',
    ARRAY[
        'Developed an eBPF kernel program in C and Go loader to bypass TCP/IP stack overhead during inter-pod communication, decreasing round-trip routing latency by 32%.',
        'Implemented a custom Kubernetes CRD controller in Go managing automated progressive canary rollouts and automated rollbacks triggered by Prometheus error metrics.',
        'Engineered an L7 HTTP/gRPC metric collector at the kernel socket layer with <0.8% CPU overhead under 100k req/sec load.'
    ],
    '{
        "infra_k8s_variant": [
            "Built Kubernetes custom controller in Go for automated canary deployments with real-time health-score evaluations.",
            "Implemented eBPF kernel socket filtering to optimize pod-to-pod network traffic, cutting latency by 32%.",
            "Instrumented Prometheus metric exporters and Grafana dashboards for cluster-wide L7 network observability."
        ],
        "backend_variant": [
            "Engineered scalable microservice traffic orchestrator in Go with dynamic routing rules and gRPC control planes."
        ]
    }'::jsonb
),
(
    'meridian',
    'Meridian',
    ARRAY['C++', 'CUDA', 'SIMD', 'AVX-512', 'H3', 'S2 Geometry', 'OpenMP', 'CMake'],
    ARRAY['spatial-indexing', 'hpc', 'cuda', 'cpp', 'simd', 'algorithms', 'performance', 'geometry'],
    'High-performance geospatial indexing and polygonal range query engine accelerated with CUDA GPU pipelines and CPU AVX-512 SIMD vectorization.',
    ARRAY[
        'Architected a GPU-accelerated spatial indexing engine using CUDA and Uber H3 hexagonal hierarchy, evaluating 100M+ geospatial polygons in under 12ms.',
        'Vectorized nearest-neighbor (k-NN) and polygon intersection routines using AVX-512 intrinsics, achieving a 7.4x throughput speedup over standard spatial libraries (GEOS).',
        'Created a compact memory-mapped tile storage layout in C++ optimizing cache locality and shrinking runtime RAM footprint by 45%.'
    ],
    '{
        "hpc_variant": [
            "Engineered CUDA GPU kernels for parallel polygon point-in-polygon verification over 100M+ coordinates in <12ms.",
            "Vectorized spatial distance kernels with AVX-512 and OpenMP, delivering 7.4x throughput over CPU baseline libraries."
        ],
        "systems_variant": [
            "Designed cache-aligned memory-mapped spatial data structures in C++20, minimizing page faults and memory overhead by 45%."
        ]
    }'::jsonb
),
(
    'arbiter',
    'Arbiter',
    ARRAY['Go', 'Apache Kafka', 'PostgreSQL', 'Redis', 'OpenTelemetry', 'Docker', 'gRPC'],
    ARRAY['distributed-systems', 'transactions', 'saga', 'kafka', 'go', 'fault-tolerance', 'backend', 'databases'],
    'Distributed transaction coordinator and saga orchestrator managing multi-phase commits, compensating workflows, and transactional outbox guarantees across microservices.',
    ARRAY[
        'Built a resilient distributed transaction orchestrator in Go supporting Saga choreographies and Two-Phase Commit (2PC) across heterogeneous database backends.',
        'Implemented transactional outbox pattern with Apache Kafka and Redis idempotency locks, guaranteeing strictly-once event execution across service partitions.',
        'Engineered automated compensation workflow engine with exponential backoff and dead-letter queues, achieving 100% eventual consistency over 50k simulated failures.'
    ],
    '{
        "backend_systems_variant": [
            "Architected distributed Saga coordinator in Go ensuring end-to-end data consistency across distributed database nodes.",
            "Built idempotent messaging pipeline using Kafka and transactional outbox pattern in PostgreSQL with strict exactly-once semantics.",
            "Instrumented distributed tracing with OpenTelemetry and Jaeger to track multi-stage transaction latencies."
        ]
    }'::jsonb
),
(
    'vexor',
    'Vexor',
    ARRAY['C++', 'Python', 'Pybind11', 'HNSW', 'Product Quantization', 'AVX2', 'gRPC', 'CMake'],
    ARRAY['machine-learning-infra', 'vector-search', 'algorithms', 'cpp', 'simd', 'low-latency', 'python', 'ai-infra'],
    'Low-latency approximate nearest neighbor (ANN) vector similarity search engine with Hierarchical Navigable Small World (HNSW) graphs and SIMD-accelerated distance kernels.',
    ARRAY[
        'Constructed an ANN vector search engine in C++ implementing HNSW graphs and Product Quantization, querying 1M 768-dimensional embeddings at 18k QPS with >98% recall.',
        'Vectorized cosine similarity and Euclidean distance kernels using AVX2 and FMA instructions, cutting inner-product computation time by 4.6x.',
        'Developed zero-copy Python C-extensions via Pybind11 and a high-concurrency gRPC server sustaining sub-2ms query latencies under 200 concurrent threads.'
    ],
    '{
        "ai_infra_variant": [
            "Engineered high-throughput vector similarity index in C++20 using HNSW and Product Quantization for high-dimensional embeddings.",
            "Accelerated distance computation using AVX2/FMA vector instructions, achieving 18k QPS at 98% recall on 1M 768-dim vectors.",
            "Created native Pybind11 Python bindings and gRPC streaming service for zero-copy embedding search."
        ]
    }'::jsonb
),
(
    'substrate',
    'Substrate',
    ARRAY['Rust', 'Lock-Free', 'Linux', 'io_uring', 'mmap', 'B-Tree', 'WAL'],
    ARRAY['systems-programming', 'storage', 'rust', 'concurrency', 'lock-free', 'performance', 'linux', 'io-uring'],
    'Modular embedded storage engine and lock-free concurrent B+ tree in Rust utilizing epoch-based memory reclamation, WAL journaling, and io_uring direct I/O.',
    ARRAY[
        'Engineered a concurrent lock-free B+ tree in Rust utilizing crossbeam epoch-based memory reclamation, achieving 1.2M concurrent reads/sec on a 16-core CPU.',
        'Implemented a zero-copy buffer pool manager with asynchronous Linux io_uring (O_DIRECT), bypassing kernel page-cache pollution and double-buffering.',
        'Designed crash-resilient Write-Ahead Logging (WAL) with CRC32 checksum verification, demonstrating zero data loss across rigorous SIGKILL crash recovery tests.'
    ],
    '{
        "systems_storage_variant": [
            "Built lock-free concurrent B+ tree in Rust using epoch memory reclamation, sustaining 1.2M reads/sec with linear scaling.",
            "Integrated asynchronous io_uring kernel submissions for direct disk I/O, reducing system call latency by 40%.",
            "Engineered ACID-compliant WAL engine with automated checkpointing and instant crash recovery."
        ]
    }'::jsonb
),
(
    'aegis',
    'Aegis',
    ARRAY['Rust', 'Aya eBPF', 'Linux TC/XDP', 'OpenSSL', 'Tokio', 'Redis'],
    ARRAY['security', 'systems-programming', 'rust', 'ebpf', 'networking', 'cryptography', 'distributed-systems'],
    'Kernel-level zero-trust API security gateway and anomaly detection filter written in Rust using Aya eBPF and XDP for wire-speed DDoS mitigation.',
    ARRAY[
        'Engineered an XDP/eBPF kernel-bypass rate limiter and volumetric DDoS packet filter in Rust, dropping malicious traffic at wire speed (14M packets/sec).',
        'Built an asynchronous TLS termination and token authentication reverse proxy in Tokio/Rust, enforcing mTLS and JWT validation at <1.2ms latency overhead.',
        'Implemented a distributed sliding-window token-bucket rate limiter with Redis cluster synchronization and sub-millisecond atomic locking.'
    ],
    '{
        "security_systems_variant": [
            "Developed XDP/eBPF packet filter in Rust running in Linux kernel space, mitigating Layer 4/7 DDoS attacks at 14M pps.",
            "Constructed async reverse proxy with Tokio enforcing mTLS encryption and cryptographic token validation.",
            "Implemented distributed rate-limiting algorithms backed by Redis cluster synchronization."
        ]
    }'::jsonb
),
(
    'streamify',
    'Streamify',
    ARRAY['Go', 'Python', 'FFmpeg', 'RabbitMQ', 'AWS S3', 'Redis', 'Docker', 'WebRTC'],
    ARRAY['distributed-systems', 'media-processing', 'go', 'python', 'queues', 'cloud', 'backend', 'video'],
    'Distributed video chunking, transcoding, and adaptive bitrate packaging pipeline using Go workers, RabbitMQ task queues, and FFmpeg.',
    ARRAY[
        'Architected a distributed video chunking and transcoding pipeline across a Go worker pool with RabbitMQ job distribution, processing 4K video 5x faster than real-time.',
        'Engineered adaptive bitrate (HLS/DASH) packaging and dynamic preview generation service handling 10TB+ daily video ingestion.',
        'Implemented automated worker autoscaling and spot-interruption fault recovery, reducing transcoding infrastructure costs by 42%.'
    ],
    '{
        "distributed_backend_variant": [
            "Built distributed video processing cluster in Go and RabbitMQ, parallelizing multi-bitrate encoding at 5x real-time.",
            "Designed resilient worker failure recovery and job re-queuing mechanisms with AWS S3 chunk staging.",
            "Integrated adaptive streaming protocol generation (HLS/DASH) with sub-second fragment delivery."
        ]
    }'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    tech_stack = EXCLUDED.tech_stack,
    tags = EXCLUDED.tags,
    summary = EXCLUDED.summary,
    quantified_bullets = EXCLUDED.quantified_bullets,
    resume_variants = EXCLUDED.resume_variants,
    updated_at = NOW();
