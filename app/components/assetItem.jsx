import React from 'react';
import {
  MediaCard,
  VideoThumbnail,
  Text,
} from '@shopify/polaris';
import { ImageAddIcon, EditIcon } from '@shopify/polaris-icons';

export default function AssetItem({ cincopaTempToken, asset, onChange }) {
  let videoLength;
  const assetDate = new Date(asset?.uploaded);
  const formattedDate = assetDate.toISOString().split('T')[0].replaceAll('-', '/');
  const thumbnailUrl = asset?.thumbnail?.url || 'https://wwwcdn.cincopa.com/_cms/design15/images/nothumb.png';

  const handleAssetClick = (rid) => {
    if (!cincopaTempToken) return;

    const editor = {
      load_modules: [
        { name: 'info', title: 'Asset Info', order: 0 },
        { name: 'thumbnail', title: 'Set Thumbnail', order: 4 },
        { name: 'video-trim', title: 'Trimming', order: 5 },
        { name: 'partitioning-speaker', title: 'Auto Transcribe & CC', feature: 'assets-subtitles', order: 7 },
        { name: 'chapters', feature: 'assets-timeline', order: 8 },
        { name: 'annotations', feature: 'assets-timeline', order: 9 },
        { name: 'call-to-action', feature: 'assets-timeline', order: 10 },
        { name: 'replace-asset', order: 11 },
        { name: 'video-renditions', feature: 'video-renditions', title: 'Renditions', order: 12 },
        { name: 'video-analytics', order: 14 },
        { name: 'downloads-asset', title: 'Attached Files & Links', order: 15 },
        { name: 'lead-generation', title: 'Lead Generation', order: 16 },
      ],
      token: cincopaTempToken,
      rid,
      editorV2: true,
    };

    window.cincopa?.loadEditor(editor);
  };

  const handleAddAsset = (asset) => {
    if (onChange && asset) {
      onChange({ selected_asset: asset });
    }
  };
  
  if ((asset?.type === 'video' || asset?.type === 'music') && asset?.exif?.duration) {
    const parts = asset.exif.duration.split(':');
    if (parts.length === 3) {
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      const seconds = parseFloat(parts[2]);
      videoLength = Math.round(hours * 3600 + minutes * 60 + seconds);
    }
  }

  return (
    <MediaCard
      title={asset?.caption || asset?.filename}
       description={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {asset?.description && (
            <Text as="span" tone="subdued">
              {asset.description}
            </Text>
          )}
          <Text as="span" tone="subdued">
            <strong>Uploaded:</strong> {formattedDate}
          </Text>
        </div>
      }
      popoverActions={[
        {
          content: 'Select Asset',
          icon: ImageAddIcon,
          onAction: () => handleAddAsset(asset),
        },
        {
          content: 'Edit Asset',
          icon: EditIcon,
          onAction: () => handleAssetClick(asset.rid),
        },
      ]}
    >
      <VideoThumbnail
        thumbnailUrl={thumbnailUrl}
        videoLength={videoLength}
      />
    </MediaCard>
  );
}
