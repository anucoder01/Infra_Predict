import React, { useEffect, useState } from 'react';

interface NewsItem {
  title: string;
  link: string;
}

export default function NewsTicker() {
  const [news, setNews] = useState<NewsItem[]>([]);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await fetch('http://localhost:8001/api/news');
        const data = await response.json();
        if (data.news && data.news.length > 0) {
          setNews(data.news);
        }
      } catch (error) {
        console.error("Failed to fetch news:", error);
      }
    };

    fetchNews();
    const interval = setInterval(fetchNews, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  if (news.length === 0) return null;

  return (
    <div className="w-full bg-slate-900 border-t border-slate-700/50 flex flex-col shrink-0 h-[140px]">
      <div className="px-3 py-1.5 text-red-500 font-bold text-xs uppercase tracking-wider bg-slate-900 border-b border-slate-700/50 sticky top-0 z-10">
        LIVE VERIFIED ALERTS
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {news.map((item, index) => (
          <div key={index} className="text-sm px-2">
            <a 
              href={item.link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-amber-500 hover:text-amber-400 hover:underline flex items-start gap-2"
            >
              <span className="text-slate-500 mt-0.5">•</span>
              <span>{item.title}</span>
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
