# Qwen Configuration

## Qwen Code Preferences
- Language: Russian
- Coding Style: Follow project conventions
- Documentation: Prefer markdown format

## Project Information
- Project: JS-UserScripts
- Description: A collection of userscripts
- Created: September 4, 2025

## Basic Settings

### File Organization
- Main scripts directory: `scripts/`
- Each script should have its own subdirectory
- Required files per script:
  - `*.user.js` (the main script file)
  - `ReadMe.md` (documentation for the script)

### Script Standards
- All scripts should follow userscript standards
- Include proper metadata blocks
- Use consistent naming conventions
- Maintain documentation in English

### Development Guidelines
- Follow existing code style in the project
- Ensure scripts are well-documented
- Test scripts before committing
- Keep dependencies minimal
- Write and run tests for new features
- Verify cross-browser compatibility
- Check for console errors and warnings
- Ensure compatibility with browser extensions: ScriptCat, Tampermonkey, Violentmonkey
- Use modern but efficient approaches
- Research solutions in open source communities where people choose the best fixes for issues

### Code Review Practices
- All changes must be reviewed before merging
- Review code for adherence to project standards
- Check for potential bugs and security issues
- Ensure documentation is updated with code changes
- Verify tests are included for new functionality

### Performance Optimization Guidelines
- Minimize DOM manipulation
- Use efficient selectors and caching when possible
- Avoid unnecessary computations in loops
- Optimize resource loading (images, external scripts)
- Profile performance regularly using browser dev tools

### Security Best Practices
- Avoid using eval() and similar functions
- Sanitize user inputs and data from external sources
- Use secure methods for handling sensitive data
- Regularly update dependencies to patch known vulnerabilities
- Implement Content Security Policy (CSP) where applicable

### Versioning Strategy
- Follow semantic versioning (MAJOR.MINOR.PATCH)
- Increment version numbers according to change impact
- Document breaking changes in release notes
- Maintain backward compatibility when possible
- Tag releases in Git with version numbers

### Dependency Management
- Audit dependencies regularly for security vulnerabilities
- Remove unused dependencies
- Prefer lightweight libraries over feature-heavy alternatives
- Document the purpose of each dependency
- Monitor for updates and apply security patches promptly

### Error Handling Standards
- Implement proper try/catch blocks for error-prone operations
- Provide meaningful error messages for debugging
- Log errors appropriately without exposing sensitive information
- Handle asynchronous errors properly
- Gracefully degrade functionality when errors occur

### Accessibility Guidelines
- Ensure proper contrast ratios for text and UI elements
- Use semantic HTML where possible
- Provide alternative text for images
- Ensure keyboard navigation support
- Test with screen readers and other assistive technologies

### Git Workflow
- Commit messages in English
- Use meaningful commit messages
- Push changes regularly
- Create separate branches for major features