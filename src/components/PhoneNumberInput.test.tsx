import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PhoneNumberInput } from './PhoneNumberInput';

const render = (props: Partial<React.ComponentProps<typeof PhoneNumberInput>>) =>
  renderToStaticMarkup(<PhoneNumberInput onChange={() => undefined} {...props} />);

describe('PhoneNumberInput', () => {
  it('offers a picker when the workflow allows every country', () => {
    expect(render({ defaultCountry: 'NG' })).toContain('role="combobox"');
  });

  it('shows one country fixed, with no picker', () => {
    const html = render({ countries: ['NG'], defaultCountry: 'GH' });
    expect(html).not.toContain('role="combobox"');
    expect(html).toContain('+234');
  });

  it('starts on a country the workflow offers when the default is not one', () => {
    const html = render({ countries: ['GH', 'KE'], defaultCountry: 'NG' });
    expect(html).toContain('role="combobox"');
    expect(html).toContain('+233');
    expect(html).not.toContain('+234');
  });
});
