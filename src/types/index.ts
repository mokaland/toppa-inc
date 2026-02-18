/// <reference types="vite/client" />

/**
 * Tsumikiri MVP Type Definitions
 *
 * This file contains the core TypeScript type definitions for the Tsumikiri MVP.
 * These types are used across the application to ensure data consistency and provide strong typing.
 */

/**
 * Represents a user in the Tsumikiri application.
 */
export interface User {
  id: string;
  name: string;
  email: string;
  // Add other user-related properties as needed, e.g., 'organizationId', 'profilePictureUrl'
}

/**
 * Represents a chat message within the Tsumikiri chat interface.
 */
export interface ChatMessage {
  id: string;
  userId: string; // The ID of the user who sent the message
  content: string;
  timestamp: Date;
  role: 'user' | 'assistant' | 'system'; // Role of the sender
  // Add other chat message-related properties as needed, e.g., 'attachments', 'readStatus'
}

/**
 * Represents a generated report in Tsumikiri.
 */
export interface Report {
  id: string;
  userId: string; // The ID of the user who generated the report
  title: string;
  content: string; // The full content of the report, could be Markdown, HTML, or plain text
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'generated' | 'published'; // Current status of the report
  // Add other report-related properties as needed, e.g., 'version', 'tags', 'documentId'
}

/**
 * Represents a document uploaded or managed within Tsumikiri.
 */
export interface Document {
  id: string;
  userId: string; // The ID of the user who uploaded the document
  name: string;
  url: string; // URL to the stored document (e.g., S3, Cloudflare R2)
  fileType: string; // e.g., 'application/pdf', 'text/csv'
  uploadedAt: Date;
  size: number; // Size of the document in bytes
  // Add other document-related properties as needed, e.g., 'tags', 'metadata'
}

/**
 * Represents a template used for generating documents or reports.
 */
export interface Template {
  id: string;
  name: string;
  content: string; // The template content, which might be a string with placeholders or a structured JSON
  type: 'report' | 'document' | 'email'; // Type of template, indicating its purpose
  createdAt: Date;
  updatedAt: Date;
  description?: string; // Optional description of the template
  // Add other template-related properties as needed, e.g., 'variables', 'language'
}

/**
 * A generic interface for API responses.
 * @template T The type of the data returned in the response.
 */
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errorCode?: string;
}
