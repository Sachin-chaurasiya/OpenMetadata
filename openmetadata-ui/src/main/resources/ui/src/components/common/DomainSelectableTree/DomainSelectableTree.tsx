/*
 *  Copyright 2025 Collate.
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *  http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
import { Button, Empty, Space, Tree } from 'antd';
import Search from 'antd/lib/input/Search';
import { AxiosError } from 'axios';
import { debounce } from 'lodash';
import React, {
  FC,
  Key,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { ReactComponent as IconDown } from '../../../assets/svg/ic-arrow-down.svg';
import { ReactComponent as IconRight } from '../../../assets/svg/ic-arrow-right.svg';
import { EntityType } from '../../../enums/entity.enum';
import { Domain } from '../../../generated/entity/domains/domain';
import { EntityReference } from '../../../generated/tests/testCase';
import { listDomainHierarchy, searchDomains } from '../../../rest/domainAPI';
import { convertDomainsToTreeOptions } from '../../../utils/DomainUtils';
import { getEntityReferenceFromEntity } from '../../../utils/EntityUtils';
import { findItemByFqn } from '../../../utils/GlossaryUtils';
import {
  escapeESReservedCharacters,
  getEncodedFqn,
} from '../../../utils/StringsUtils';
import { showErrorToast } from '../../../utils/ToastUtils';
import Loader from '../Loader/Loader';
import './domain-selectable.less';
import {
  DomainSelectableTreeProps,
  TreeListItem,
} from './DomainSelectableTree.interface';

const DomainSelectablTree: FC<DomainSelectableTreeProps> = ({
  onSubmit,
  value,
  visible,
  onCancel,
  isMultiple = false,
}) => {
  const { t } = useTranslation();
  const [treeData, setTreeData] = useState<TreeListItem[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [selectedDomains, setSelectedDomains] = useState<Key[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const handleSave = async () => {
    setIsSubmitLoading(true);
    if (isMultiple) {
      const selectedData = [];
      for (const item of selectedDomains) {
        selectedData.push(findItemByFqn(domains, item as string, false));
      }
      const domains1 = selectedData.map((item) =>
        getEntityReferenceFromEntity(item as EntityReference, EntityType.DOMAIN)
      );
      await onSubmit(domains1);
    } else {
      let retn: EntityReference[] = [];
      if (selectedDomains.length > 0) {
        const initialData = findItemByFqn(
          domains,
          selectedDomains[0] as string,
          false
        );
        const domain = getEntityReferenceFromEntity(
          initialData as EntityReference,
          EntityType.DOMAIN
        );
        retn = [domain];
      }
      await onSubmit(retn);
    }

    setIsSubmitLoading(false);
  };

  const fetchAPI = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await listDomainHierarchy({ limit: 100 });
      setTreeData(convertDomainsToTreeOptions(data.data, 0, isMultiple));
      setDomains(data.data);
    } catch (error) {
      showErrorToast(error as AxiosError);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const onSelect = (selectedKeys: React.Key[]) => {
    if (!isMultiple) {
      setSelectedDomains(selectedKeys);
    }
  };

  const onCheck = (
    checked: Key[] | { checked: Key[]; halfChecked: Key[] }
  ): void => {
    if (Array.isArray(checked)) {
      setSelectedDomains(checked);
    } else {
      setSelectedDomains(checked.checked);
    }
  };

  const onSearch = debounce(async (value: string) => {
    setSearchTerm(value);
    if (value) {
      try {
        setIsLoading(true);
        const encodedValue = getEncodedFqn(escapeESReservedCharacters(value));
        const results: Domain[] = await searchDomains(encodedValue);
        const updatedTreeData = convertDomainsToTreeOptions(
          results,
          0,
          isMultiple
        );
        setTreeData(updatedTreeData);
      } finally {
        setIsLoading(false);
      }
    } else {
      fetchAPI();
    }
  }, 300);

  const switcherIcon = useCallback(({ expanded }) => {
    return expanded ? <IconDown /> : <IconRight />;
  }, []);

  const treeContent = useMemo(() => {
    if (isLoading) {
      return <Loader />;
    } else if (treeData.length === 0) {
      return (
        <Empty
          description={t('label.no-entity-available', {
            entity: t('label.domain'),
          })}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      );
    } else {
      return (
        <Tree
          blockNode
          checkStrictly
          defaultExpandAll
          showLine
          autoExpandParent={Boolean(searchTerm)}
          checkable={isMultiple}
          className="domain-selectable-tree"
          defaultCheckedKeys={isMultiple ? value : []}
          defaultExpandedKeys={value}
          defaultSelectedKeys={isMultiple ? [] : value}
          multiple={isMultiple}
          switcherIcon={switcherIcon}
          treeData={treeData}
          onCheck={onCheck}
          onSelect={onSelect}
        />
      );
    }
  }, [isLoading, treeData, value, onSelect, isMultiple, searchTerm]);

  useEffect(() => {
    if (visible) {
      setSearchTerm('');
      fetchAPI();
    }
  }, [visible]);

  return (
    <div className="p-sm" data-testid="domain-selectable-tree">
      <Search
        data-testid="searchbar"
        placeholder="Search"
        style={{ marginBottom: 8 }}
        onChange={(e) => onSearch(e.target.value)}
      />

      {treeContent}

      <Space className="p-sm p-b-xss p-l-xs custom-dropdown-render" size={8}>
        <Button
          className="update-btn"
          data-testid="saveAssociatedTag"
          // disabled={isEmpty(glossaries)}
          htmlType="submit"
          loading={isSubmitLoading}
          size="small"
          type="default"
          onClick={() => handleSave()}>
          {t('label.update')}
        </Button>
        <Button
          data-testid="cancelAssociatedTag"
          size="small"
          type="link"
          onClick={onCancel}>
          {t('label.cancel')}
        </Button>
      </Space>
    </div>
  );
};

export default DomainSelectablTree;
