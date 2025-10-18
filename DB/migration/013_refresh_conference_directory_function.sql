-- Ensure the participant directory RPC is available and PostgREST picks it up.
create or replace function public.get_conference_participant_directory(p_conference_id uuid)
returns table (
    participant_id uuid,
    user_id uuid,
    conference_id uuid,
    introduction_id uuid,
    current_location_id uuid,
    display_name text,
    affiliation text,
    introduction_summary text,
    location jsonb,
    registered_at timestamptz,
    updated_at timestamptz
)
security definer
set search_path = public
language plpgsql
as $$
begin
    if auth.uid() is null then
        raise exception 'authentication required';
    end if;

    if not exists (
        select 1
        from participants
        where conference_id = p_conference_id
          and user_id = auth.uid()
    ) then
        raise exception 'not registered for this conference';
    end if;

    return query
    select
        p.id as participant_id,
        p.user_id,
        p.conference_id,
        p.introduction_id,
        p.current_location_id,
        coalesce(i.name, '匿名参加者') as display_name,
        coalesce(i.affiliation, '所属未設定') as affiliation,
        coalesce(i.one_liner, i.research_topic, i.interests) as introduction_summary,
        case when l.id is not null then
            jsonb_build_object(
                'id', l.id,
                'name', l.name,
                'floor', l.floor,
                'building', l.building,
                'location_type', l.location_type
            )
        else null end as location,
        p.registered_at,
        p.updated_at
    from participants p
    left join introductions i
        on i.id = p.introduction_id
    left join locations l
        on l.id = p.current_location_id
    where p.conference_id = p_conference_id;
end;
$$;

revoke all on function public.get_conference_participant_directory(uuid) from public;
grant execute on function public.get_conference_participant_directory(uuid) to authenticated;

-- Force PostgREST to pick up the new function definition immediately.
notify pgrst, 'reload schema';
