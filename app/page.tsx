'use client'

import { useState, useMemo, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { formatDate } from '../utils/formatDate';

interface Page {
  title: string;
  created: string;
  updated: string;
  lines: any[];
  [key: string]: any;
}

const highlightMatches = (text: string, searchTerms: string[]) => {
  if (searchTerms.length === 0) return text;
  
  const regex = new RegExp(`(${searchTerms.join('|')})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, index) => 
    regex.test(part) ? <mark key={index} className="bg-yellow-200 dark:bg-yellow-800">{part}</mark> : part
  );
};

const countLinesAndChars = (lines: any[]): { lineCount: number; charCount: number } => {
  return lines.reduce((counts, line) => {
    if (typeof line === 'string') {
      counts.lineCount += 1;
      counts.charCount += line.length;
    } else if (typeof line === 'object' && line.text) {
      counts.lineCount += 1;
      counts.charCount += line.text.length;
    }
    return counts;
  }, { lineCount: 0, charCount: 0 });
};

const getPreviewLines = (lines: any[]): string[] => {
  return lines.slice(0, 5).map(line => 
    typeof line === 'string' ? line : (line.text || '')
  );
};

export default function Home() {
  const [jsonData, setJsonData] = useState<any>(null)
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [totalPages, setTotalPages] = useState(0)
  const [previewPages, setPreviewPages] = useState<Set<number>>(new Set());

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const text = await file.text()
      try {
        const json = JSON.parse(text)
        if (json.pages && Array.isArray(json.pages)) {
          setJsonData(json)
          setTotalPages(json.pages.length)
          setSelectedPages(new Set(json.pages.map((_: any, index: number) => index)))
        } else {
          console.error('Invalid JSON structure: missing or invalid pages array')
        }
      } catch (error) {
        console.error('Error parsing JSON:', error)
      }
    }
  }

  const filteredPages = useMemo(() => {
    if (!jsonData) return [];
    const searchTerms = searchTerm.toLowerCase().split(/\s+/).filter(term => term.length > 0);
    return {
      pages: jsonData.pages.filter((page) =>
        searchTerms.every(term => page.title.toLowerCase().includes(term))
      ),
      searchTerms
    };
  }, [jsonData, searchTerm]);

  const handleExport = () => {
    if (!jsonData) return

    const selectedPagesArray = Array.from(selectedPages)
    const filteredPages = jsonData.pages.filter((_: any, index: number) => selectedPagesArray.includes(index))
    const newJson = { ...jsonData, pages: filteredPages }
    const blob = new Blob([JSON.stringify(newJson, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'exported_pages.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const togglePageSelection = (index: number) => {
    setSelectedPages(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  const selectAll = () => {
    if (jsonData) {
      setSelectedPages(new Set(jsonData.pages.map((_: any, index: number) => index)))
    }
  }

  const deselectAll = () => {
    setSelectedPages(new Set())
  }

  const togglePreview = (index: number) => {
    setPreviewPages(prevPreviews => {
      const newPreviews = new Set(prevPreviews);
      if (newPreviews.has(index)) {
        newPreviews.delete(index);
      } else {
        newPreviews.add(index);
      }
      return newPreviews;
    });
  };

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-center mb-4">
        Cosense exported JSON processor
      </h1>
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          <Input
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
            id="import-input"
          />
          <Button asChild>
            <label htmlFor="import-input">Import</label>
          </Button>
          {jsonData && (
            <>
              <Button onClick={handleExport}>Export</Button>
              <Button onClick={selectAll} variant="outline">Select All</Button>
              <Button onClick={deselectAll} variant="outline">Deselect All</Button>
            </>
          )}
        </div>
        {jsonData && (
          <div className="text-sm text-muted-foreground">
            Selected: {selectedPages.size} / {totalPages} pages
          </div>
        )}
      </div>
      {jsonData && (
        <Input
          type="text"
          placeholder="Search pages..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-4"
        />
      )}
      {jsonData && (
        <ScrollArea className="h-[calc(100vh-250px)] border rounded-md p-4">
          <ul className="space-y-2">
            {filteredPages.pages.map((page, index) => (
              <li key={index} className="bg-secondary rounded-md overflow-hidden">
                <div 
                  className="flex items-center gap-2 p-2 cursor-pointer hover:bg-secondary/80"
                  onClick={() => togglePreview(jsonData.pages.indexOf(page))}
                >
                  <Checkbox
                    id={`page-${index}`}
                    checked={selectedPages.has(jsonData.pages.indexOf(page))}
                    onCheckedChange={(checked) => {
                      togglePageSelection(jsonData.pages.indexOf(page));
                      if (checked === false) {
                        setPreviewPages(prevPreviews => {
                          const newPreviews = new Set(prevPreviews);
                          newPreviews.delete(jsonData.pages.indexOf(page));
                          return newPreviews;
                        });
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex-grow">
                    <label htmlFor={`page-${index}`} className="cursor-pointer font-medium">
                      {highlightMatches(page.title, filteredPages.searchTerms)}
                    </label>
                    <div className="text-xs text-muted-foreground mt-1">
                      <span>Created: {formatDate(page.created)}</span>
                      <span className="ml-2">Updated: {formatDate(page.updated)}</span>
                      {page.lines && (
                        <>
                          <span className="ml-2">
                            Lines: {countLinesAndChars(page.lines).lineCount}
                          </span>
                          <span className="ml-2">
                            Characters: {countLinesAndChars(page.lines).charCount}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {previewPages.has(jsonData.pages.indexOf(page)) && (
                  <div className="p-2 bg-muted/50 border-t border-border">
                    {getPreviewLines(page.lines).map((line, i) => (
                      <p key={i} className="text-sm">{line}</p>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </ScrollArea>
      )}
      {!jsonData && (
        <div className="text-center mt-8">
          <p className="text-lg text-muted-foreground">Please import a JSON file to begin.</p>
        </div>
      )}
    </main>
  )
}

