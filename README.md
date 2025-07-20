# Multi Project Management & SOP Framework AI

## Project Overview
This project transforms an existing AI chatbot training system into a comprehensive project management platform with AI-powered document analysis and SOP compliance checking. The system enables users to upload project documents, configure AI settings, and query documents with cross-reference to company Standard Operating Procedures (SOPs).

## Current System Architecture

### Backend (NestJS)
- **Framework**: NestJS with TypeScript
- **Database**: MySQL with Sequelize ORM
- **Authentication**: JWT with Passport.js
- **File Processing**: Custom service with external API integration
- **AI Integration**: OpenAI API with vector database support

### Frontend (Vue.js)
- **Framework**: Vue.js 3 with Composition API
- **Styling**: SCSS with custom styling
- **State Management**: Vuex
- **Routing**: Vue Router

## Key Features Being Added

### 1. Enhanced File Processing
- **Current**: PDF and CSV files only
- **Enhanced**: XLS, XLSX, TXT, and image files (JPG, PNG, GIF)
- **Purpose**: Support invoices, contracts, manuals, emails, transcripts, and compliance screenshots

### 2. SOP Library Integration
- **Capability**: Manage ~400 SOP documents as baseline knowledge
- **Integration**: Cross-reference project documents with company SOPs
- **AI Enhancement**: SOP compliance checking in AI responses

### 3. Project-Specific AI Queries
- **Context Selection**: Choose project context for AI queries
- **Combined Analysis**: Project documents + SOP library
- **Specialized Prompts**: Project-specific and SOP compliance prompts

### 4. AI Configuration Management
- **User Control**: View/edit AI prompts with lock/unlock functionality
- **Model Selection**: Choose between OpenAI and OpenRouter models
- **API Integration**: Support for both OpenAI and OpenRouter APIs

### 5. Professional UI/UX
- **Design**: Project management-friendly interface
- **Features**: Drag-and-drop file upload, file categorization, enhanced project management
- **Responsive**: Works across desktop and mobile devices

## Implementation Plan

### Phase 1: Backend File Processing Enhancement (HIGH PRIORITY)
1. **Expand File Type Support** - Add XLS, XLSX, TXT, image processing
2. **Enhance File Metadata** - Add categorization and tracking fields
3. **Test File Processing** - Verify all file types work correctly

### Phase 2: SOP Library Integration (HIGH PRIORITY)
1. **Create SOP Management System** - New module for SOP documents
2. **Integrate SOP with AI Processing** - Combine project docs + SOPs
3. **Test SOP Integration** - Verify SOP cross-referencing works

### Phase 3: AI Configuration Management (MEDIUM PRIORITY)
1. **Create AI Configuration System** - User-configurable AI settings
2. **Add OpenRouter API Support** - Dual API provider support
3. **Test AI Configuration** - Verify prompt editing and model selection

### Phase 4: Frontend UI/UX Enhancement (MEDIUM PRIORITY)
1. **Implement Professional Color Scheme** - Business-friendly design
2. **Enhanced Project Management Interface** - Comprehensive project handling
3. **Enhanced Chat Interface** - Project context and SOP integration

### Phase 5: Integration Testing and Deployment (LOW PRIORITY)
1. **End-to-End Testing** - Complete user workflow testing
2. **Deployment Preparation** - Environment setup and documentation

## Documentation Structure

The `cline_docs/` folder contains comprehensive planning documentation:

- **projectRoadmap.md** - High-level goals and completion criteria
- **currentTask.md** - Current objectives and next steps
- **techStack.md** - Technology decisions and architecture
- **codebaseSummary.md** - Project structure and key components
- **todo.md** - Detailed task breakdown with priorities
- **requiredChanges.md** - Specific file modifications needed
- **uiEnhancements.md** - UI/UX improvements and design system

## Key File Modifications Required

### Backend Changes
1. **File Processing Service** (`ai-bots-admin-main/src/large-files-processing/large-files-processing.service.ts`)
   - Expand supported file types
   - Add text extraction for Excel files
   - Add image metadata handling

2. **Learning Session Model** (`ai-bots-admin-main/src/large-files-processing/learnings-sessions.model.ts`)
   - Add file categorization fields
   - Add metadata tracking

3. **New SOP Module** (`ai-bots-admin-main/src/sop/`)
   - Complete new module for SOP management
   - SOP document model and service

4. **AI Configuration Module** (`ai-bots-admin-main/src/ai-config/`)
   - User-configurable AI settings
   - Prompt editing and model selection

5. **GPT API Service** (`ai-bots-admin-main/src/gptapi/gptapi.service.ts`)
   - Add OpenRouter API support
   - Dual provider handling

### Frontend Changes
1. **Global Styles** (`MackFAQ-front-main/src/assets/css/style.scss`)
   - Professional color palette
   - Modern component design system

2. **Projects View** (`MackFAQ-front-main/src/views/Projects.vue`)
   - Enhanced project management interface
   - Drag-and-drop file upload
   - AI configuration section

3. **Chat View** (`MackFAQ-front-main/src/views/Chat.vue`)
   - Project context selection
   - SOP integration toggle

## Development Guidelines

### File Processing Priority
- Excel files (invoices, contracts)
- Text files (emails, transcripts)
- Images (compliance screenshots)

### SOP Integration Strategy
- Use existing vector database infrastructure
- Implement SOP-specific querying logic
- Add source attribution for SOP references

### UI/UX Design Principles
- Professional business appearance
- Intuitive project-centric workflow
- Responsive design for all devices

## Testing Strategy

### File Processing Testing
- Test all supported file types
- Verify text extraction accuracy
- Test file categorization logic

### SOP Integration Testing
- Test with sample SOP documents
- Verify cross-referencing functionality
- Test AI compliance checking

### End-to-End Testing
- Complete user workflow testing
- Performance testing with large files
- Multi-user concurrent testing

## Deployment Requirements

### Environment Configuration
- API keys for OpenAI and OpenRouter
- File storage configuration
- Database schema updates

### Performance Considerations
- Enhanced storage for SOP library
- Optimized vector database queries
- Efficient file processing pipeline

## Success Criteria

- ✅ All required file types supported and processed correctly
- ✅ SOP library fully integrated with AI queries
- ✅ Project-specific context working in chat interface
- ✅ Professional UI matches project management standards
- ✅ Both OpenAI and OpenRouter APIs functional
- ✅ System deployed and accessible via Kaizen subdomain

## Timeline
- **Week 1-2**: Backend enhancements (file processing, SOP integration, API expansion)
- **Week 2-3**: Frontend UI/UX improvements and AI configuration interface
- **Week 3-4**: Testing, refinements, and deployment preparation

## Budget
- **Total**: $1000 (excluding post-development server hosting fees)
- **Payment Structure**: 10% escrowed, 50% initialization, remaining upon completion

This project transforms the existing AI chatbot system into a comprehensive project management platform while preserving the core functionality and adding powerful new features for document analysis and SOP compliance.
