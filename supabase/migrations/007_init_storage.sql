INSERT INTO storage.buckets
    (id, name, public)
VALUES
    ('abstracts', 'abstracts', true);

INSERT INTO storage.buckets
    (id, name, public)
VALUES
    ('maps', 'maps', true);

CREATE POLICY "public can select in abstracts and maps"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id IN ('abstracts', 'maps'));

CREATE POLICY "public can insert in abstracts and maps"
    ON storage.objects
    FOR INSERT
    TO public
    USING (bucket_id IN ('abstracts', 'maps'));

CREATE POLICY "public can update in abstracts and maps"
    ON storage.objects
    FOR UPDATE
    TO public
    USING (bucket_id IN ('abstracts', 'maps'));

CREATE POLICY "public can delete in abstracts and maps"
    ON storage.objects
    FOR DELETE
    TO public
    USING (bucket_id IN ('abstracts', 'maps'));