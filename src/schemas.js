export const SCHEMA_PRESETS = [
  {
    id: 'none',
    label: 'No schema (parse only)',
    schema: null,
  },
  {
    id: 'utility_bill',
    label: 'SDGE Electric Bill',
    renderer: 'sdge_bill',
    schema: {
      type: 'object',
      title: 'Utility Bill Field Extraction Schema',
      properties: {
        account_summary: {
          type: 'object',
          title: 'Account Summary',
          properties: {
            current_charges: {
              type: 'number',
              description: 'The charges incurred during the current billing period.',
            },
            total_amount_due: {
              type: 'number',
              description: 'The total amount currently due.',
            },
          },
        },
        gas_summary: {
          type: 'object',
          title: 'Gas Usage Summary',
          properties: {
            total_therms_used: {
              type: 'number',
              description: 'Total therms of gas used in the billing period.',
            },
            gas_current_charges: {
              type: 'number',
              description: 'The gas charges incurred during the current billing period.',
            },
            gas_usage_chart: {
              type: 'boolean',
              description: 'Does the document contain a chart of historical gas usage?',
            },
            gas_max_month: {
              type: 'string',
              description:
                'Which month has the highest historical gas usage? Return month name only.',
            },
          },
        },
        electric_summary: {
          type: 'object',
          title: 'Electric Usage Summary',
          properties: {
            total_kwh_used: {
              type: 'number',
              description: 'Total kilowatt hours of electricity used in the billing period.',
            },
            electric_current_charges: {
              type: 'number',
              description: 'The electric charges incurred during the current billing period.',
            },
            electric_usage_chart: {
              type: 'boolean',
              description:
                'Does the document contain a chart of historical electric usage?',
            },
            electric_max_month: {
              type: 'string',
              description:
                'Which month has the highest historical electric usage? Return month name only.',
            },
          },
        },
      },
    },
  },
  {
    id: 'custom',
    label: 'Custom JSON schema',
    schema: null,
  },
]

export function initSchemaSelector() {
  const select = document.getElementById('schema-preset')
  const preview = document.getElementById('schema-preview')
  const input = document.getElementById('schema-input')

  select.addEventListener('change', () => {
    const preset = SCHEMA_PRESETS.find((p) => p.id === select.value)
    if (select.value === 'none') {
      preview.hidden = true
      input.value = ''
    } else if (select.value === 'custom') {
      preview.hidden = false
      input.value = ''
      input.readOnly = false
      input.placeholder =
        '{"type": "object", "properties": {"field": {"type": "string", "description": "..."}}}'
      input.focus()
    } else {
      preview.hidden = false
      input.value = JSON.stringify(preset.schema, null, 2)
      input.readOnly = true
    }
  })
}

export function getSelectedSchema() {
  const input = document.getElementById('schema-input')
  return input.value.trim() || null
}

export function getSelectedPresetId() {
  return document.getElementById('schema-preset').value
}
