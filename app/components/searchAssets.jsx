import {
  Frame,
  Modal,
  ButtonGroup,
  TextField,
  Select,
  Button,
  Spinner,
  BlockStack,
  Box,
  Text,
} from '@shopify/polaris';
import { useState, useEffect } from 'react';
import { apiAssetList } from '../constants/apiUrls';
import AssetItem from '../components/assetItem';

function SearchAssets({ cincopaTempToken, openSearchModal, onClose, onSelect }) {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [filterTimer, setFilterTimer] = useState(null);
  const [isMoreAssets, setIsMoreAssets] = useState(false);
  const [searchField, setSearchField] = useState('by_title');

  const searchFields = [
    { label: 'By Title', value: 'by_title' },
    { label: 'By Asset Id', value: 'by_asset_id' },
    { label: 'By Asset Tag', value: 'by_asset_tag' },
  ];

  useEffect(() => {
    if (cincopaTempToken) {
      fetchData(true);
    }
  }, [cincopaTempToken]);

  useEffect(() => {
    if (searchField && searchValue !== '') {
      setIsLoading(true);
      getFilteredData();
    }

    if (filterTimer) {
      clearTimeout(filterTimer);
    }
  }, [searchField, searchValue]);

  useEffect(() => {
    const loadScripts = async () => {
        try {
            await loadScript("//wwwcdn.cincopa.com/_cms/media-platform/libasync.js");

        } catch (error) {
            console.error("Error loading scripts:", error);
        }
        };

        loadScripts();
    }, []);

    const loadScript = (src) => {
        return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = (err) => reject(new Error(`Script load error: ${src}`));
        document.body.appendChild(script);
        });
    };

    const fetchData = async (firstPage = false) => {
        try {
        const currentPage = firstPage ? 1 : page;
        const response = await fetch(
            `${apiAssetList}?api_token=${cincopaTempToken}&items_per_page=50&page=${currentPage}`
        );

        if (!response.ok) throw new Error('Failed to fetch data');
        const result = await response.json();

        setIsMoreAssets(result?.items_data.page < result?.items_data.pages_count);

        if (firstPage) {
            setData(result);
            setPage(2);
            setSearchValue('');
        } else {
            setData((prev) => ({
            ...result,
            items: [...(prev?.items || []), ...result.items],
            }));
            setPage((prevPage) => prevPage + 1);
        }

        setPages(result?.items_data.pages_count);
        setIsLoading(false);
        } catch (err) {
        setData({});
        setIsLoading(false);
        }
    } ;

  const getFilteredData = async () => {
        if (!searchValue) return;

        if (filterTimer) clearTimeout(filterTimer);

        const timer = setTimeout(async () => {
        let url = `${apiAssetList}?api_token=${cincopaTempToken}`;

        if (searchField === 'by_asset_id') {
            url += `&rid=${searchValue}`;
        } else if (searchField === 'by_title') {
            url += `&details=${searchValue}`;
        } else if (searchField === 'by_asset_tag') {
            url += `&tag=${searchValue}`;
        }

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch data');

            const filtered = await response.json();
            setData(filtered);
            setIsMoreAssets(false);
            setIsLoading(false);
        } catch (err) {
            setData({});
            setIsLoading(false);
        }
        }, 800);

        setFilterTimer(timer);
    };

    const handleAssetSelect = (selected_asset) => {
        if(onSelect && selected_asset){
            onSelect(selected_asset);
        }
    };

  const renderAssets = () => {
    if (!data?.items?.length) {
      return <Text as="p">No assets found.</Text>;
    }

    return (
        <BlockStack padding={4} wrap={'wrap'}>
            {data.items.map((asset, index) => (
                <Box key={asset?.rid} style={{width: '100%', marginBottom: '30px'}}>
                    <AssetItem
                        cincopaTempToken={cincopaTempToken}
                        asset={asset}
                        onChange={handleAssetSelect}
                    />
                </Box>
            ))}
        </BlockStack>
    );
  };

  return (
    <div style={{ height: '500px' }}>
      <Frame>
        <Modal
          size="large"
          open={openSearchModal}
          onClose={onClose}
          title="Select an Asset from Your Cincopa Account"
          secondaryActions={[
            {
              content: 'Close',
              onAction: onClose,
            },
          ]}
        >
          <Modal.Section>
            <BlockStack gap="400">
              <ButtonGroup gap="400" align="start">
                <Select
                  label="Search by"
                  options={searchFields}
                  value={searchField}
                  onChange={setSearchField}
                />
                <TextField
                  label="Search"
                  value={searchValue}
                  onChange={setSearchValue}
                  autoComplete="off"
                />
              </ButtonGroup>

              {isLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <Spinner accessibilityLabel="Loading assets" size="large" />
                </div>
              ) : (
                renderAssets()
              )}

              {!isLoading && isMoreAssets && (
                <div style={{ textAlign: 'center' }}>
                  <Button onClick={() => fetchData(false)}>Load More</Button>
                </div>
              )}
            </BlockStack>
          </Modal.Section>
        </Modal>
      </Frame>
    </div>
  );
}

export default SearchAssets;
