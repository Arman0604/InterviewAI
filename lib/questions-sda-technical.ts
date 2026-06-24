/**
 * Technical Round - System Design Architect
 * Role-specific questions for architecture, scalability, reliability, and trade-off discussion.
 */
import type { InterviewQuestion } from "./question-types";

export const SDA_TECHNICAL_QUESTIONS: InterviewQuestion[] = [
  {
    id: "sda-tech-req-1",
    role: "system-design-architect",
    roundType: "technical",
    topic: "Requirements",
    question: "When you start a system design problem, how do you clarify functional and non-functional requirements?",
    answerKeywords: ["functional requirements", "non-functional requirements", "scale", "latency", "availability", "constraints", "trade-offs"],
    expectedAnswer:
      "A strong answer separates functional requirements from non-functional requirements, asks about scale, latency, availability, data volume, consistency, constraints, and uses those answers to drive trade-offs before proposing architecture.",
  },
  {
    id: "sda-tech-scale-1",
    role: "system-design-architect",
    roundType: "technical",
    topic: "Capacity Estimation",
    question: "How would you estimate traffic, storage, and bandwidth for a new large-scale service?",
    answerKeywords: ["daily active users", "requests per second", "read write ratio", "storage", "bandwidth", "peak traffic", "growth"],
    expectedAnswer:
      "Estimate daily active users, requests per second, read/write ratio, average payload size, storage per day, bandwidth, peak traffic multiplier, and growth rate. The goal is approximate sizing that informs database, cache, and infrastructure choices.",
  },
  {
    id: "sda-tech-hld-1",
    role: "system-design-architect",
    roundType: "technical",
    topic: "High Level Design",
    question: "Design a URL shortener like bit.ly at a high level. What components would you include?",
    answerKeywords: ["API server", "short code generation", "database", "cache", "redirect", "collision", "analytics", "rate limiting"],
    expectedAnswer:
      "A good design includes API servers, short code generation, collision handling, a persistent database, cache for hot redirects, redirect service, analytics pipeline, rate limiting, and considerations for availability and low latency.",
  },
  {
    id: "sda-tech-hld-2",
    role: "system-design-architect",
    roundType: "technical",
    topic: "High Level Design",
    question: "Design a real-time chat system. What are the core services and data flows?",
    answerKeywords: ["WebSocket", "message service", "presence", "fanout", "message store", "delivery acknowledgement", "push notification"],
    expectedAnswer:
      "A chat system usually needs WebSocket gateways, message service, presence service, message store, fanout mechanism, delivery/read acknowledgements, offline push notifications, and partitioning by user or conversation.",
  },
  {
    id: "sda-tech-api-1",
    role: "system-design-architect",
    roundType: "technical",
    topic: "API Design",
    question: "What makes an API design good for a distributed system?",
    answerKeywords: ["clear contracts", "idempotency", "pagination", "versioning", "timeouts", "retries", "backward compatibility", "error model"],
    expectedAnswer:
      "Good API design has clear contracts, consistent error models, versioning, pagination for list endpoints, idempotency for writes, timeout and retry semantics, backward compatibility, and observability-friendly request identifiers.",
  },
  {
    id: "sda-tech-data-1",
    role: "system-design-architect",
    roundType: "technical",
    topic: "Data Modeling",
    question: "How do you choose between SQL and NoSQL databases in a system design interview?",
    answerKeywords: ["schema", "transactions", "joins", "consistency", "query patterns", "horizontal scale", "flexible schema"],
    expectedAnswer:
      "Choose SQL when structured schema, joins, transactions, and strong consistency are important. Choose NoSQL when access patterns are simple, schema is flexible, horizontal scale is critical, or high write throughput is needed. The choice should follow query patterns and consistency needs.",
  },
  {
    id: "sda-tech-cache-1",
    role: "system-design-architect",
    roundType: "technical",
    topic: "Caching",
    question: "Explain cache-aside and write-through caching. When would you use each?",
    answerKeywords: ["cache-aside", "write-through", "miss", "database", "staleness", "write latency", "read-heavy"],
    expectedAnswer:
      "In cache-aside, the application reads from cache, fetches from the database on miss, and populates cache. It suits read-heavy workloads but can serve stale data. Write-through updates cache and database together, improving consistency at the cost of write latency.",
  },
  {
    id: "sda-tech-cache-2",
    role: "system-design-architect",
    roundType: "technical",
    topic: "Caching",
    question: "What problems can caching introduce, and how do you mitigate them?",
    answerKeywords: ["stale data", "cache stampede", "hot keys", "eviction", "TTL", "jitter", "invalidation"],
    expectedAnswer:
      "Caching can introduce stale data, cache stampedes, hot keys, poor eviction behavior, and invalidation complexity. Mitigations include TTLs, jitter, request coalescing, background refresh, sharding hot keys, and explicit invalidation for critical paths.",
  },
  {
    id: "sda-tech-lb-1",
    role: "system-design-architect",
    roundType: "technical",
    topic: "Load Balancing",
    question: "How does load balancing improve scalability and availability?",
    answerKeywords: ["distribute traffic", "health checks", "horizontal scaling", "failover", "least connections", "round robin"],
    expectedAnswer:
      "Load balancers distribute traffic across healthy instances, enable horizontal scaling, remove failed nodes through health checks, and support failover. Algorithms include round robin, least connections, weighted routing, and consistent hashing.",
  },
  {
    id: "sda-tech-consistency-1",
    role: "system-design-architect",
    roundType: "technical",
    topic: "Consistency",
    question: "Explain strong consistency versus eventual consistency with an example.",
    answerKeywords: ["strong consistency", "eventual consistency", "latest write", "replication lag", "availability", "trade-off"],
    expectedAnswer:
      "Strong consistency means reads reflect the latest committed write, which is useful for financial or inventory systems. Eventual consistency allows temporary replication lag but improves availability and latency, often used for feeds, metrics, and caches.",
  },
  {
    id: "sda-tech-cap-1",
    role: "system-design-architect",
    roundType: "technical",
    topic: "CAP Theorem",
    question: "What does the CAP theorem mean in practical system design?",
    answerKeywords: ["consistency", "availability", "partition tolerance", "network partition", "trade-off", "CP", "AP"],
    expectedAnswer:
      "CAP says that during a network partition, a distributed system must trade off consistency and availability. Practical designs still need partition tolerance, then decide whether to favor CP behavior for correctness or AP behavior for availability.",
  },
  {
    id: "sda-tech-queue-1",
    role: "system-design-architect",
    roundType: "technical",
    topic: "Message Queues",
    question: "Why would you introduce a message queue into an architecture?",
    answerKeywords: ["asynchronous processing", "decoupling", "buffering", "backpressure", "retry", "durability", "consumer"],
    expectedAnswer:
      "A queue decouples producers and consumers, supports asynchronous processing, buffers bursts, enables retries and durability, smooths load, and helps handle backpressure when downstream systems are slower than incoming traffic.",
  },
  {
    id: "sda-tech-shard-1",
    role: "system-design-architect",
    roundType: "technical",
    topic: "Sharding",
    question: "How would you shard a database, and what pitfalls should you watch for?",
    answerKeywords: ["shard key", "data distribution", "hot shard", "rebalancing", "cross-shard query", "consistent hashing"],
    expectedAnswer:
      "Choose a shard key that distributes load evenly and matches access patterns. Watch for hot shards, cross-shard queries, rebalancing complexity, uneven growth, and operational overhead. Consistent hashing can reduce movement during scaling.",
  },
  {
    id: "sda-tech-cdn-1",
    role: "system-design-architect",
    roundType: "technical",
    topic: "CDN",
    question: "Where does a CDN fit in a scalable web architecture?",
    answerKeywords: ["edge cache", "static assets", "latency", "origin offload", "TTL", "invalidation", "global users"],
    expectedAnswer:
      "A CDN caches static or cacheable content at edge locations close to users. It reduces latency, offloads origin servers, improves availability for global users, and requires TTL and invalidation strategies for content freshness.",
  },
  {
    id: "sda-tech-rate-1",
    role: "system-design-architect",
    roundType: "technical",
    topic: "Rate Limiting",
    question: "Design a rate limiter. Which algorithms might you use?",
    answerKeywords: ["token bucket", "leaky bucket", "fixed window", "sliding window", "Redis", "distributed", "user key"],
    expectedAnswer:
      "Common algorithms include token bucket, leaky bucket, fixed window, and sliding window. In distributed systems, counters are often stored in Redis or another fast shared store keyed by user, API key, or IP with clear limits and expiry.",
  },
  {
    id: "sda-tech-reliability-1",
    role: "system-design-architect",
    roundType: "technical",
    topic: "Reliability",
    question: "What techniques make a service resilient to downstream failures?",
    answerKeywords: ["timeouts", "retries", "circuit breaker", "bulkhead", "fallback", "graceful degradation", "idempotency"],
    expectedAnswer:
      "Use timeouts, bounded retries with backoff, circuit breakers, bulkheads, fallbacks, graceful degradation, idempotent operations, and clear error handling so one failing dependency does not cascade across the system.",
  },
  {
    id: "sda-tech-observe-1",
    role: "system-design-architect",
    roundType: "technical",
    topic: "Observability",
    question: "What should you instrument in a production distributed system?",
    answerKeywords: ["logs", "metrics", "traces", "latency", "error rate", "saturation", "correlation id", "alerts"],
    expectedAnswer:
      "Instrument structured logs, metrics, traces, latency, throughput, error rates, saturation, dependency health, and business metrics. Correlation IDs and alerts tied to service-level objectives help diagnose incidents quickly.",
  },
  {
    id: "sda-tech-micro-1",
    role: "system-design-architect",
    roundType: "technical",
    topic: "Microservices",
    question: "When would you choose microservices over a modular monolith?",
    answerKeywords: ["team autonomy", "independent scaling", "deployment", "bounded context", "operational complexity", "distributed transactions"],
    expectedAnswer:
      "Microservices are useful for independent team ownership, deployment, and scaling around bounded contexts. A modular monolith may be better early because microservices add network, observability, data ownership, and distributed transaction complexity.",
  },
  {
    id: "sda-tech-search-1",
    role: "system-design-architect",
    roundType: "technical",
    topic: "Search",
    question: "How would you add search to an application with millions of records?",
    answerKeywords: ["inverted index", "Elasticsearch", "OpenSearch", "indexing pipeline", "eventual consistency", "ranking", "pagination"],
    expectedAnswer:
      "Use a search engine such as Elasticsearch or OpenSearch with inverted indexes. Feed it through an indexing pipeline from the source database, handle eventual consistency, design ranking and filtering, and support efficient pagination.",
  },
  {
    id: "sda-tech-migration-1",
    role: "system-design-architect",
    roundType: "technical",
    topic: "Migrations",
    question: "How do you roll out a risky database schema change with minimal downtime?",
    answerKeywords: ["backward compatible", "expand and contract", "dual write", "backfill", "feature flag", "rollback", "migration"],
    expectedAnswer:
      "Use an expand-and-contract migration: add backward-compatible schema first, deploy code that can read both shapes, backfill data, optionally dual-write, switch with a feature flag, monitor, and remove old schema only after rollback risk is low.",
  },
];
