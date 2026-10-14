import React, { useMemo, useState } from 'react';
import DOMPurify from 'dompurify';
import { Mail, Paperclip, Calendar, User, Eye, FileText, Code2, ExternalLink } from 'lucide-react';
import { EmailLead } from '../../types';
import { formatISTDateTime } from '../../utils/date';

interface EmailContentRendererProps {
  lead: EmailLead;
  compact?: boolean;
}

export const EmailContentRenderer: React.FC<EmailContentRendererProps> = ({ lead, compact = false }) => {
  const [viewMode, setViewMode] = useState<'formatted' | 'raw'>('formatted');

  // Check if lead body is HTML or has body_html
  const isHtml = useMemo(() => {
    if (lead.body_html && lead.body_html.trim().length > 0) return true;
    const bodyStr = lead.body || '';
    return /<\/?[a-z][\s\S]*>/i.test(bodyStr);
  }, [lead.body, lead.body_html]);

  const rawHtmlContent = lead.body_html || (isHtml ? lead.body : '');

  // Sanitize HTML safely using DOMPurify
  const sanitizedHtml = useMemo(() => {
    if (!rawHtmlContent) return '';
    return DOMPurify.sanitize(rawHtmlContent, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote',
        'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
        'a', 'span', 'div', 'img', 'hr', 'pre', 'code', 'sub', 'sup'
      ],
      ALLOWED_ATTR: [
        'href', 'target', 'rel', 'src', 'alt', 'title', 'class', 'style',
        'width', 'height', 'align', 'valign', 'border', 'cellpadding', 'cellspacing', 'colspan', 'rowspan'
      ],
      ADD_ATTR: ['target'],
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'meta', 'link'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'javascript:']
    });
  }, [rawHtmlContent]);

  // Parse attachments metadata if present
  const attachments: string[] = useMemo(() => {
    if (!lead.attachments_info) return [];
    try {
      const parsed = JSON.parse(lead.attachments_info);
      if (Array.isArray(parsed)) return parsed;
      if (typeof parsed === 'string') return [parsed];
      return [];
    } catch {
      return lead.attachments_info.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }, [lead.attachments_info]);

  // Convert plain text URLs into safe clickable links while preserving whitespace
  const renderPlainTextWithLinks = (text: string) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:text-indigo-800 underline inline-flex items-center gap-0.5 break-all"
            onClick={(e) => e.stopPropagation()}
          >
            <span>{part}</span>
            <ExternalLink className="w-3 h-3 inline" />
          </a>
        );
      }
      return <React.Fragment key={index}>{part}</React.Fragment>;
    });
  };

  const formattedDate = useMemo(() => {
    return formatISTDateTime(lead.received_at);
  }, [lead.received_at]);

  if (compact) {
    return (
      <div className="space-y-1.5 text-xs text-slate-700">
        <div className="font-semibold text-slate-900 line-clamp-1">{lead.subject}</div>
        <p className="line-clamp-2 text-slate-600 leading-relaxed whitespace-pre-line">
          {lead.body.slice(0, 160)}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
      {/* Email Header Panel */}
      <div className="p-5 sm:p-6 bg-slate-50/70 border-b border-slate-100 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-snug">
            {lead.subject}
          </h2>
          {isHtml && (
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 self-start sm:self-auto text-xs">
              <button
                type="button"
                onClick={() => setViewMode('formatted')}
                className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1.5 ${
                  viewMode === 'formatted'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Formatted</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('raw')}
                className={`px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1.5 ${
                  viewMode === 'raw'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Plain Text</span>
              </button>
            </div>
          )}
        </div>

        {/* Metadata Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 pt-2 border-t border-slate-200/60">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-500 w-16 flex-shrink-0">From:</span>
              <span className="font-bold text-slate-900">{lead.sender_name}</span>
              <span className="text-slate-500 text-[11px]">&lt;{lead.sender_email}&gt;</span>
            </div>
            {lead.recipient && (
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-500 w-16 flex-shrink-0">To:</span>
                <span className="text-slate-700 font-medium">{lead.recipient}</span>
              </div>
            )}
            {lead.company && (
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-500 w-16 flex-shrink-0">Company:</span>
                <span className="font-medium text-slate-800">{lead.company}</span>
              </div>
            )}
          </div>

          <div className="space-y-1 sm:text-right">
            <div className="flex items-center sm:justify-end gap-1.5 text-slate-500">
              <Calendar className="w-3.5 h-3.5" />
              <span>Received: <strong className="text-slate-800">{formattedDate}</strong></span>
            </div>
            {lead.category_name && (
              <div className="flex items-center sm:justify-end gap-1.5">
                <span className="text-slate-500">Category:</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-semibold border border-indigo-100">
                  {lead.category_name}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Attachments metadata if available */}
        {attachments.length > 0 && (
          <div className="pt-2 border-t border-slate-200/60 flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <Paperclip className="w-3.5 h-3.5" />
              Attachments ({attachments.length}):
            </span>
            {attachments.map((file, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-700 shadow-2xs"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                <span>{file}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Email Body Rendering */}
      <div className="p-6">
        {isHtml && viewMode === 'formatted' ? (
          <div
            className="email-sanitized-content prose prose-slate max-w-none text-sm text-slate-800 leading-relaxed font-sans"
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />
        ) : (
          <div className="font-sans text-sm text-slate-800 whitespace-pre-wrap leading-relaxed break-words bg-slate-50/50 p-5 rounded-xl border border-slate-100">
            {renderPlainTextWithLinks(lead.body)}
          </div>
        )}
      </div>
    </div>
  );
};
