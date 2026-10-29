import { notify } from '@/utils/notify';
// Print utility: opens a print window with only the specified HTML content

export function printDocument(title: string, bodyHTML: string, styles?: string) {
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) {
    notify('warning', 'Impression bloquée', 'Autorisez les fenêtres pop-up pour ce site, puis réessayez.');
    return;
  }

  const defaultStyles = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #1f2937;
      background: white;
      padding: 40px;
      font-size: 14px;
      line-height: 1.5;
    }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 8px 12px; text-align: left; }
    th { border-bottom: 2px solid #e5e7eb; font-size: 11px; text-transform: uppercase; color: #9ca3af; }
    td { border-bottom: 1px solid #f3f4f6; font-size: 13px; }
    @media print {
      body { padding: 20px; }
      .no-print { display: none !important; }
      .page-break { page-break-before: always; }
    }
    ${styles ?? ''}
  `;

  printWindow.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>${defaultStyles}</style></head><body>${bodyHTML}<script>window.onload=function(){window.print();setTimeout(function(){window.close()},500);}</script></body></html>`);
  printWindow.document.close();
}

export function printElement(elementId: string, title: string) {
  const el = document.getElementById(elementId);
  if (!el) {
    notify('error', 'Impression impossible', 'Le contenu à imprimer est introuvable.');
    return;
  }

  const docStyles = `
    #document-preview { max-width: 800px; margin: 0 auto; background: white; padding: 32px; }
    #document-preview .flex { display: flex; }
    #document-preview .justify-between { justify-content: space-between; }
    #document-preview .items-start { align-items: flex-start; }
    #document-preview .items-center { align-items: center; }
    #document-preview .text-right { text-align: right; }
    #document-preview .border-b { border-bottom: 1px solid #e5e7eb; }
    #document-preview .border-t { border-top: 1px solid #e5e7eb; }
    #document-preview .font-bold { font-weight: 700; }
    #document-preview .font-semibold { font-weight: 600; }
    #document-preview .font-medium { font-weight: 500; }
    #document-preview .text-gray-900 { color: #111827; }
    #document-preview .text-gray-800 { color: #1f2937; }
    #document-preview .text-gray-700 { color: #374151; }
    #document-preview .text-gray-600 { color: #4b5563; }
    #document-preview .text-gray-500 { color: #6b7280; }
    #document-preview .text-gray-400 { color: #9ca3af; }
    #document-preview .text-xs { font-size: 11px; }
    #document-preview .text-sm { font-size: 13px; }
    #document-preview .text-lg { font-size: 18px; }
    #document-preview .text-2xl { font-size: 24px; }
    #document-preview .uppercase { text-transform: uppercase; }
    #document-preview .tracking-wide { letter-spacing: 0.025em; }
    #document-preview .mt-1 { margin-top: 4px; }
    #document-preview .mt-2 { margin-top: 8px; }
    #document-preview .mt-3 { margin-top: 12px; }
    #document-preview .mt-4 { margin-top: 16px; }
    #document-preview .mt-1\\.5 { margin-top: 6px; }
    #document-preview .mt-6 { margin-top: 24px; }
    #document-preview .mt-8 { margin-top: 32px; }
    #document-preview .pb-2 { padding-bottom: 8px; }
    #document-preview .pb-6 { padding-bottom: 24px; }
    #document-preview .pt-2 { padding-top: 8px; }
    #document-preview .pt-4 { padding-top: 16px; }
    #document-preview .pr-3 { padding-right: 12px; }
    #document-preview .py-3 { padding: 12px 0; }
    #document-preview .w-16 { width: 64px; }
    #document-preview .w-20 { width: 80px; }
    #document-preview .w-28 { width: 112px; }
    #document-preview .w-32 { width: 128px; }
    #document-preview .w-72 { width: 288px; }
    #document-preview .w-full { width: 100%; }
    #document-preview .max-w-\\[800px\\] { max-width: 800px; }
    #document-preview .bg-accent-600 { background: #3b4fd6; }
    #document-preview .text-white { color: white; }
    #document-preview .rounded-lg { border-radius: 8px; }
    #document-preview .h-10 { height: 40px; }
    #document-preview .w-10 { width: 40px; }
    #document-preview .h-12 { height: 48px; }
    #document-preview .max-w-\\[140px\\] { max-width: 140px; }
    #document-preview .object-contain { object-fit: contain; }
    #document-preview img { max-height: 48px; }
    #document-preview .justify-center { justify-content: center; }
    #document-preview .justify-end { justify-content: flex-end; }
    #document-preview .gap-2 { gap: 8px; }
    #document-preview .space-y-1\\.5 > * + * { margin-top: 6px; }
    #document-preview .space-y-3 > * + * { margin-top: 12px; }
    #document-preview .border-gray-200 { border-color: #e5e7eb; }
    #document-preview .border-gray-300 { border-color: #d1d5db; }
    #document-preview .border-gray-100 { border-color: #f3f4f6; }
    #document-preview .border-b-2 { border-bottom: 2px solid #e5e7eb; }
    #document-preview .border-t-2 { border-top: 2px solid #e5e7eb; }
    #document-preview .border-gray-900 { border-color: #111827; }
    #document-preview.font-serif { font-family: Georgia, 'Times New Roman', serif; }
    #document-preview[data-template="classique"] th { border-bottom-color: #111827; color: #111827; }
    #document-preview[data-template="minimal"] th { border-bottom-width: 1px; }
    #document-preview .text-center { text-align: center; }
    #document-preview .flex-1 { flex: 1; }
    #document-preview .min-w-\\[800px\\] { min-width: 800px; }
    #document-preview .num-amount { font-family: 'Geist Mono', ui-monospace, monospace; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
  `;

  printDocument(title, el.outerHTML, docStyles);
}