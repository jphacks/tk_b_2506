import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database helper functions
export const db = {
  // Get all conferences
  async getConferences(includeInactive = false) {
    let query = supabase
      .from('conferences')
      .select('*')
      .order('start_date', { ascending: false });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  // Get all locations for a conference
  async getLocations(conferenceId: string) {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('conference_id', conferenceId)
      .order('name');

    if (error) throw error;
    return data ?? [];
  },

  // Get all tags
  async getTags() {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('name');

    if (error) throw error;
    return data ?? [];
  },

  // Create a new tag
  async createTag(name: string, description?: string) {
    const { data, error } = await supabase
      .from('tags')
      .insert({ name, description })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get presentations for a conference
  async getPresentations(conferenceId: string) {
    const { data, error } = await supabase
      .from('presentations')
      .select(`
        *,
        location:locations(id, name),
        tags:presentation_tags(
          tag:tags(id, name, description)
        )
      `)
      .eq('conference_id', conferenceId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  },

  // Create a new presentation
  async createPresentation(presentation: {
    conference_id: string;
    title: string;
    abstract?: string;
    pdf_url?: string;
    ai_summary?: string;
    presentation_type: 'oral' | 'poster';
    location_id?: string;
    presenter_name?: string;
    presenter_affiliation?: string;
    scheduled_at?: string;
  }) {
    const { data, error } = await supabase
      .from('presentations')
      .insert(presentation)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update a presentation
  async updatePresentation(id: string, updates: Partial<{
    title: string;
    abstract: string;
    pdf_url: string;
    ai_summary: string;
    presentation_type: 'oral' | 'poster';
    location_id: string;
    presenter_name: string;
    presenter_affiliation: string;
    scheduled_at: string;
  }>) {
    const { data, error } = await supabase
      .from('presentations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Add tags to a presentation
  async addPresentationTags(presentationId: string, tagIds: string[]) {
    const insertData = tagIds.map(tagId => ({
      presentation_id: presentationId,
      tag_id: tagId
    }));

    const { data, error } = await supabase
      .from('presentation_tags')
      .insert(insertData)
      .select();

    if (error) throw error;
    return data;
  },

  // Remove all tags from a presentation
  async removePresentationTags(presentationId: string) {
    const { error } = await supabase
      .from('presentation_tags')
      .delete()
      .eq('presentation_id', presentationId);

    if (error) throw error;
  },

  // Upload file to storage
  async uploadFile(bucket: string, path: string, file: File) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        upsert: true
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return { path: data.path, publicUrl };
  }
};
