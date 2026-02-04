declare module 'draft-convert' {
  import { ContentState } from 'draft-js';
  
  export function convertToHTML(contentState: ContentState): string;
  export function convertFromHTML(html: string): ContentState;
}
