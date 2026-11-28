-- api-gaps: a VRF request id is unique per round, not globally. Real Chainlink request ids are hash-derived and
-- unique anyway, but every new local devnet coordinator (Anvil e2e) restarts its ids at 1.
DROP INDEX "randomness_requests_provider_request_id_key";
CREATE UNIQUE INDEX "randomness_requests_round_id_provider_request_id_key" ON "randomness_requests"("round_id", "provider", "request_id");
