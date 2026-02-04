declare module 'html-to-draftjs' {
  import { ContentBlock } from 'draft-js';
  
  interface ContentBlockResult {
    contentBlocks: ContentBlock[];
    entityMap: any;
  }
  
  export default function htmlToDraft(html: string): ContentBlockResult | null;
}
