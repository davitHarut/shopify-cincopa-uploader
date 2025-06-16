import { Box } from "@shopify/polaris"
import { useEffect, useState, useRef } from 'react';

function EmbedCode({ asset }) {
    const [templateId, setTemplateId] = useState('A4HAcLOLOO68');
    const containerRef = useRef(null);

    useEffect(() => {
        if (asset) {
            switch (asset.type) {
                case 'video':
                    setTemplateId('A4HAcLOLOO68');
                    break;
                case 'image':
                    setTemplateId('A8AAFV8a-H5b');
                    break;
                case 'music':
                    setTemplateId('AEFALSr3trK4');
                    break;
                case 'unknown':
                    setTemplateId('AYFACCtYYllw');
                    break;
                default:
                    setTemplateId('A4HAcLOLOO68');
            }
        }
    }, [asset]);

    useEffect(() => {
        if (!asset?.rid) return;

        const embedId = `cincopa_${templateId}${asset.rid}`;

        if (window._cincopa && typeof window._cincopa._async !== 'undefined') {
            window._cincopa._async = [];
        }

        if (containerRef.current) {
            containerRef.current.innerHTML = '';
        }

        const script = document.createElement('script');
        script.src = `//rtcdn.cincopa.com/meta_json.aspx?fid=${templateId}!${asset.rid}&ver=v2&id=${embedId}`;
        script.async = true;
        script.onload = () => {
            const asyncScript = document.createElement('script');
            asyncScript.src = '//rtcdn.cincopa.com/libasync.js';
            asyncScript.async = true;
            document.body.appendChild(asyncScript);
        };
        script.onerror = (err) => console.error(`Error loading embed script: ${err.message}`);

        document.body.appendChild(script);

        return () => {
            if (containerRef.current) {
                containerRef.current.innerHTML = '';
            }
        };
    }, [asset, templateId]);

    return (
      <Box>
        <div
          ref={containerRef}
          id={`cincopa_${templateId}${asset?.rid}`}
          className='gallerydemo cincopa-fadein'
          style={{
              maxWidth: '100%',
              width: '100%',
              height: 'auto',
          }}
        />
      </Box>
    );
}

export default EmbedCode;
