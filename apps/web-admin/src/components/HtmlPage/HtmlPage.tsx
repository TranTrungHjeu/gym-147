import React, { useEffect, useState } from 'react';
import { PageLoading } from '../ui/AppLoading';

interface HtmlPageProps {
  htmlFile: string;
}

const HtmlPage: React.FC<HtmlPageProps> = ({ htmlFile }) => {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHtmlContent = async () => {
      try {
        const response = await fetch(`/homepage/${htmlFile}`);
        if (response.ok) {
          let html = await response.text();

          // Fix relative paths to absolute paths
          html = html.replace(/href="\.\/([^"]+)"/g, 'href="/$1"');
          html = html.replace(/src="([^"]+)"/g, (match, src) => {
            if (src.startsWith('http') || src.startsWith('/')) {
              return match;
            }
            return `src="/${src}"`;
          });

          // Extract body content only (remove html, head tags)
          const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
          if (bodyMatch) {
            setHtmlContent(bodyMatch[1]);
          } else {
            setHtmlContent(html);
          }
        } else {
          setHtmlContent('<div class="container"><h1>Page not found</h1></div>');
        }
      } catch (error) {
        console.error('Error loading HTML:', error);
        setHtmlContent('<div class="container"><h1>Error loading page</h1></div>');
      } finally {
        setLoading(false);
      }
    };

    loadHtmlContent();
  }, [htmlFile]);

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #1a1a1d 0%, #0c0c0f 45%, #ff6b35 100%)',
        }}
      >
        <PageLoading />
      </div>
    );
  }

  return <div className='html-page-wrapper' dangerouslySetInnerHTML={{ __html: htmlContent }} />;
};

export default HtmlPage;
