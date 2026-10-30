// One config object per database table. The generic page at /db/[resource]
// and the generic server actions both read from here, so adding a table to
// the admin area is just adding an entry below.

export type FieldType = 'text' | 'textarea' | 'number' | 'boolean' | 'ref' | 'datetime' | 'uuid'

export type Field = {
  name: string
  label: string
  type: FieldType
  required?: boolean
  /** show in the table (default true) */
  list?: boolean
  /** can be set in create/edit forms (default true, except id/created_at) */
  editable?: boolean
  placeholder?: string
  /** for type 'ref': which table + column to show instead of the id */
  ref?: { table: string; label: string }
  /** long text: show a preview in the table, full text when expanded */
  long?: boolean
}

export type Mode = 'crud' | 'read' | 'mix'

export type Resource = {
  key: string
  table: string
  title: string
  group: string
  icon: string
  description: string
  mode: Mode
  orderBy: { column: string; ascending: boolean }
  fields: Field[]
}

const id: Field = { name: 'id', label: 'ID', type: 'number', editable: false }
const created: Field = { name: 'created_at', label: 'Created', type: 'datetime', editable: false }
const profileRef: Field = {
  name: 'profile_id',
  label: 'User',
  type: 'ref',
  editable: false,
  ref: { table: 'profiles', label: 'first_name' },
}

export const RESOURCES: Resource[] = [
  // ---------- Prompt chains ----------
  {
    key: 'prompt-chains',
    table: 'humor_flavors',
    title: 'Prompt Chains',
    group: 'Prompting',
    icon: '⛓️',
    description: 'Each prompt chain ("humor flavor") is a recipe the AI follows to write captions.',
    mode: 'read',
    orderBy: { column: 'id', ascending: true },
    fields: [
      id,
      { name: 'slug', label: 'Name', type: 'text' },
      { name: 'description', label: 'Description', type: 'textarea' },
      created,
    ],
  },
  {
    key: 'prompt-chain-steps',
    table: 'humor_flavor_steps',
    title: 'Prompt Chain Steps',
    group: 'Prompting',
    icon: '🪜',
    description: 'The individual prompts inside each chain, run in order.',
    mode: 'read',
    orderBy: { column: 'order_by', ascending: true },
    fields: [
      id,
      { name: 'humor_flavor_id', label: 'Chain', type: 'ref', ref: { table: 'humor_flavors', label: 'slug' } },
      { name: 'order_by', label: 'Step #', type: 'number' },
      { name: 'llm_model_id', label: 'Model', type: 'ref', ref: { table: 'llm_models', label: 'name' } },
      { name: 'temperature', label: 'Temp', type: 'number' },
      { name: 'system_prompt', label: 'System prompt', type: 'textarea', long: true },
      { name: 'user_prompt', label: 'User prompt', type: 'textarea', long: true },
      { name: 'description', label: 'Notes', type: 'text', list: false },
    ],
  },
  {
    key: 'prompt-chain-mix',
    table: 'humor_flavor_mix',
    title: 'Prompt Chain Mix',
    group: 'Prompting',
    icon: '🎛️',
    description: 'How many captions each chain writes for every photo. Change a number and the caption app uses it on the next upload.',
    mode: 'mix',
    orderBy: { column: 'id', ascending: true },
    fields: [
      id,
      { name: 'humor_flavor_id', label: 'Chain', type: 'ref', editable: false, ref: { table: 'humor_flavors', label: 'slug' } },
      { name: 'caption_count', label: 'Captions per photo', type: 'number', required: true },
      { name: 'updated_at', label: 'Updated', type: 'datetime', editable: false },
    ],
  },
  {
    key: 'terms',
    table: 'terms',
    title: 'Terms',
    group: 'Prompting',
    icon: '📖',
    description: 'Slang and local words that get added to the prompt so captions sound like Sam.',
    mode: 'crud',
    orderBy: { column: 'priority', ascending: false },
    fields: [
      id,
      { name: 'term', label: 'Term', type: 'text', required: true, placeholder: 'Bodega' },
      { name: 'definition', label: 'Definition', type: 'textarea', required: true },
      { name: 'example', label: 'Example', type: 'textarea' },
      { name: 'priority', label: 'Priority', type: 'number', placeholder: '0' },
      created,
    ],
  },
  {
    key: 'caption-examples',
    table: 'caption_examples',
    title: 'Caption Examples',
    group: 'Prompting',
    icon: '💡',
    description: 'Great captions shown to the AI as examples of the style we want.',
    mode: 'crud',
    orderBy: { column: 'priority', ascending: false },
    fields: [
      id,
      { name: 'image_description', label: 'Photo description', type: 'textarea', required: true },
      { name: 'caption', label: 'Caption', type: 'textarea', required: true },
      { name: 'explanation', label: 'Why it works', type: 'textarea' },
      { name: 'priority', label: 'Priority', type: 'number', placeholder: '0' },
      created,
    ],
  },

  // ---------- AI models ----------
  {
    key: 'llm-providers',
    table: 'llm_providers',
    title: 'LLM Providers',
    group: 'AI Models',
    icon: '🏢',
    description: 'Companies whose AI models we can use.',
    mode: 'crud',
    orderBy: { column: 'id', ascending: true },
    fields: [
      id,
      { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Google' },
      { name: 'website', label: 'Website', type: 'text', placeholder: 'https://…' },
      created,
    ],
  },
  {
    key: 'llm-models',
    table: 'llm_models',
    title: 'LLM Models',
    group: 'AI Models',
    icon: '🧠',
    description: 'The models available to prompt chain steps. The caption app uses the step’s model.',
    mode: 'crud',
    orderBy: { column: 'id', ascending: true },
    fields: [
      id,
      { name: 'name', label: 'Display name', type: 'text', required: true, placeholder: 'Gemini 3.5 Flash' },
      { name: 'provider_model_id', label: 'API model ID', type: 'text', required: true, placeholder: 'gemini-3.5-flash' },
      { name: 'llm_provider_id', label: 'Provider', type: 'ref', required: true, ref: { table: 'llm_providers', label: 'name' } },
      { name: 'is_active', label: 'Active', type: 'boolean' },
      created,
    ],
  },

  // ---------- Activity logs ----------
  {
    key: 'generation-requests',
    table: 'caption_requests',
    title: 'Generation Requests',
    group: 'Activity',
    icon: '📨',
    description: 'Every time someone asked the AI for captions.',
    mode: 'read',
    orderBy: { column: 'created_at', ascending: false },
    fields: [
      id,
      profileRef,
      { name: 'image_id', label: 'Photo', type: 'ref', ref: { table: 'images', label: 'url' } },
      { name: 'humor_flavor_id', label: 'Chain', type: 'ref', ref: { table: 'humor_flavors', label: 'slug' } },
      { name: 'theme', label: 'Theme', type: 'text' },
      { name: 'status', label: 'Status', type: 'text' },
      { name: 'error_message', label: 'Error', type: 'text', long: true },
      created,
    ],
  },
  {
    key: 'llm-responses',
    table: 'llm_model_responses',
    title: 'LLM Responses',
    group: 'Activity',
    icon: '💬',
    description: 'The exact prompt sent to the model and what it answered, with timing.',
    mode: 'read',
    orderBy: { column: 'created_at', ascending: false },
    fields: [
      id,
      { name: 'caption_request_id', label: 'Request', type: 'number' },
      { name: 'model_name', label: 'Model', type: 'text' },
      { name: 'status', label: 'Status', type: 'text' },
      { name: 'processing_time_ms', label: 'Time (ms)', type: 'number' },
      { name: 'system_prompt', label: 'System prompt', type: 'textarea', long: true, list: false },
      { name: 'user_prompt', label: 'Prompt', type: 'textarea', long: true },
      { name: 'response', label: 'Response', type: 'textarea', long: true },
      created,
    ],
  },

  // ---------- Access ----------
  {
    key: 'signup-domains',
    table: 'allowed_signup_domains',
    title: 'Allowed Sign-up Domains',
    group: 'Access',
    icon: '🌐',
    description: 'Email domains (like columbia.edu) that are allowed to create accounts.',
    mode: 'crud',
    orderBy: { column: 'apex_domain', ascending: true },
    fields: [
      id,
      { name: 'apex_domain', label: 'Domain', type: 'text', required: true, placeholder: 'columbia.edu' },
      created,
    ],
  },
  {
    key: 'whitelisted-emails',
    table: 'whitelist_email_addresses',
    title: 'Whitelisted Emails',
    group: 'Access',
    icon: '✉️',
    description: 'Individual email addresses that are always allowed, even outside the allowed domains.',
    mode: 'crud',
    orderBy: { column: 'email', ascending: true },
    fields: [
      id,
      { name: 'email', label: 'Email', type: 'text', required: true, placeholder: 'friend@gmail.com' },
      created,
    ],
  },
]

export function getResource(key: string) {
  return RESOURCES.find((r) => r.key === key)
}

export const isEditable = (f: Field) => f.editable !== false && f.name !== 'id' && f.type !== 'datetime'
export const isListed = (f: Field) => f.list !== false
