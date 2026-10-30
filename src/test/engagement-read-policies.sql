-- Execute inside a transaction against the deployed schema; no data mutations.
DO $$
DECLARE name text; predicate text;
BEGIN
  FOREACH name IN ARRAY ARRAY['post_likes', 'post_comments'] LOOP
    SELECT qual INTO predicate FROM pg_policies
      WHERE schemaname = 'public' AND tablename = name
      AND policyname = CASE WHEN name = 'post_likes' THEN 'Likes are readable' ELSE 'Comments are readable' END;
    IF predicate IS NULL OR predicate = 'true' OR predicate NOT LIKE '%EXISTS%' OR predicate NOT LIKE '%posts%' OR predicate NOT LIKE '%post_id%' THEN
      RAISE EXCEPTION 'Engagement reads must require a visible parent post: %', name;
    END IF;
  END LOOP;
END $$;