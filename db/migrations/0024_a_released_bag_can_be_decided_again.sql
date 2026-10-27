-- A bag can be decided again after it went back on the shelf.
--
-- `decision_bags` had a unique index on `bag_id`, read as "a bag is issued
-- once". But a decision only reserves, and the row it writes stays when the
-- request is cancelled and its bags go back to `available`, and a returned unit
-- can be restocked. The next decision to claim such a bag then failed on the
-- index, and kept failing for that group until the bag expired. The index stays
-- for lookups by bag, without the uniqueness. The bag's own status is what
-- keeps one unit from two requests at once.
DROP INDEX "hospital"."decision_bags_bag_idx";--> statement-breakpoint
CREATE INDEX "decision_bags_bag_idx" ON "hospital"."decision_bags" USING btree ("bag_id");