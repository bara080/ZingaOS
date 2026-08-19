'use client';

import SectionBlock from '@/components/common/SectionBlock';
import KeyValue from '@/components/common/KeyValue';

interface Props {
  stores?: string[];
  isCustomer?: boolean;
}

export function LinkedAccountsBlock({ stores, isCustomer }: Props) {
  return (
    <SectionBlock title="Linked Accounts">
      <KeyValue label="Stores" value={stores} />
      <KeyValue label="Is Customer" value={isCustomer ? 'Yes' : 'No'} />
    </SectionBlock>
  );
}
