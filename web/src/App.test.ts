import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import App from './App.vue'

describe('App', () => {
  it('renders the latest Vite Vue template shell', () => {
    const wrapper = mount(App)

    expect(wrapper.text()).toContain('Get started')
    expect(wrapper.text()).toContain('Count is 0')
  })
})
