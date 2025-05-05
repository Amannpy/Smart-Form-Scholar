// Content script for Smart Form Scholar
// This script runs on Google Forms pages to detect and fill form fields

// Global variables
let formFieldsMap = new Map();
let fieldAliases = {
  // Personal information
  "first name": ["first name", "firstname", "first", "given name", "forename"],
  "last name": ["last name", "lastname", "last", "surname", "family name"],
  "email": ["email", "e-mail", "email address", "e-mail address"],
  "phone": ["phone", "telephone", "phone number", "mobile", "cell", "contact number"],
  
  // Academic information
  "university": ["university", "college", "school", "institution", "campus"],
  "student id": ["student id", "student number", "id number", "university id", "student identification"],
  "major": ["major", "program", "field of study", "concentration", "department", "course"],
  "graduation year": ["graduation year", "year of graduation", "expected graduation", "expected graduation year"],
  "gpa": ["gpa", "grade point average", "academic average", "cumulative gpa"]
};

// AI-based field detection (simulated)
function analyzeFieldWithAI(labelText, fieldType) {
  labelText = labelText.toLowerCase().trim();
  
  // Check each category in our aliases dictionary
  for (const [category, aliases] of Object.entries(fieldAliases)) {
    if (aliases.some(alias => labelText.includes(alias))) {
      return category;
    }
  }
  
  // Check for partial matches with higher threshold for confidence
  for (const [category, aliases] of Object.entries(fieldAliases)) {
    for (const alias of aliases) {
      // Calculate similarity score (simple version - check if it contains at least 70% of the alias words)
      const aliasWords = alias.split(' ');
      const labelWords = labelText.split(' ');
      const matchingWords = aliasWords.filter(word => labelWords.includes(word));
      
      if (matchingWords.length > 0 && matchingWords.length / aliasWords.length >= 0.7) {
        return category;
      }
    }
  }
  
  // Return null if no match is found
  return null;
}

// Map profile fields to form fields
function getProfileValue(profile, fieldCategory) {
  switch (fieldCategory) {
    // Personal information
    case "first name": return profile.personal.firstName;
    case "last name": return profile.personal.lastName;
    case "email": return profile.personal.email;
    case "phone": return profile.personal.phone;
    
    // Academic information
    case "university": return profile.academic.university;
    case "student id": return profile.academic.studentId;
    case "major": return profile.academic.major;
    case "graduation year": return profile.academic.graduationYear;
    case "gpa": return profile.academic.gpa;
    
    default: return null;
  }
}

// Detect form fields on the page
function detectFormFields() {
  formFieldsMap.clear();
  
  // Get all form elements
  const formElements = document.querySelectorAll('.freebirdFormviewerComponentsQuestionBaseRoot');
  
  formElements.forEach((element, index) => {
    // Get the label text
    const labelElement = element.querySelector('.freebirdFormviewerComponentsQuestionBaseHeader');
    if (!labelElement) return;
    
    const labelText = labelElement.textContent.trim();
    
    // Get the input element based on the question type
    let inputElement;
    let fieldType;
    
    // Short answer or paragraph
    const textInput = element.querySelector('input[type="text"]');
    const textArea = element.querySelector('textarea');
    
    // Multiple choice
    const radioInputs = element.querySelectorAll('input[type="radio"]');
    
    // Checkboxes
    const checkboxInputs = element.querySelectorAll('input[type="checkbox"]');
    
    // Dropdown
    const selectElement = element.querySelector('select');
    
    if (textInput) {
      inputElement = textInput;
      fieldType = 'text';
    } else if (textArea) {
      inputElement = textArea;
      fieldType = 'paragraph';
    } else if (radioInputs.length > 0) {
      inputElement = radioInputs;
      fieldType = 'radio';
    } else if (checkboxInputs.length > 0) {
      inputElement = checkboxInputs;
      fieldType = 'checkbox';
    } else if (selectElement) {
      inputElement = selectElement;
      fieldType = 'select';
    }
    
    // If we found an input element and label
    if (inputElement && labelText) {
      formFieldsMap.set(index, {
        label: labelText,
        element: inputElement,
        type: fieldType
      });
    }
  });
  
  return formFieldsMap.size;
}

// Fill form fields with profile data
function fillForm(profile, template, useAI) {
  const fieldsCount = detectFormFields();
  let filledCount = 0;
  
  formFieldsMap.forEach((field, index) => {
    let fieldCategory = null;
    
    // Try to determine the field category
    if (useAI) {
      fieldCategory = analyzeFieldWithAI(field.label, field.type);
    } else {
      // Simple matching without AI
      const labelLower = field.label.toLowerCase();
      for (const [category, aliases] of Object.entries(fieldAliases)) {
        if (aliases.some(alias => labelLower.includes(alias))) {
          fieldCategory = category;
          break;
        }
      }
    }
    
    // If we identified the field and have a value, fill it
    if (fieldCategory) {
      const value = getProfileValue(profile, fieldCategory);
      
      if (value && field.element) {
        fillFieldWithValue(field.element, field.type, value);
        filledCount++;
      }
    }
  });
  
  return filledCount;
}

// Helper function to fill different field types
function fillFieldWithValue(element, type, value) {
  switch (type) {
    case 'text':
    case 'paragraph':
      element.value = value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      break;
    
    case 'radio':
      // For radio buttons, try to find the best match
      Array.from(element).forEach(radio => {
        const labelElement = radio.closest('label') || 
                            document.querySelector(`label[for="${radio.id}"]`);
        
        if (labelElement) {
          const labelText = labelElement.textContent.toLowerCase().trim();
          
          // Check if the value is contained in the label text or vice versa
          if (labelText.includes(value.toLowerCase()) || value.toLowerCase().includes(labelText)) {
            radio.click();
            return;
          }
        }
      });
      break;
    
    case 'checkbox':
      // For checkboxes, check if any match our value (as a comma-separated list)
      const values = value.split(',').map(v => v.trim().toLowerCase());
      
      Array.from(element).forEach(checkbox => {
        const labelElement = checkbox.closest('label') || 
                            document.querySelector(`label[for="${checkbox.id}"]`);
        
        if (labelElement) {
          const labelText = labelElement.textContent.toLowerCase().trim();
          
          if (values.some(v => labelText.includes(v) || v.includes(labelText))) {
            checkbox.click();
          }
        }
      });
      break;
    
    case 'select':
      // For dropdowns, try to find the best matching option
      Array.from(element.options).forEach(option => {
        const optionText = option.textContent.toLowerCase().trim();
        
        if (optionText.includes(value.toLowerCase()) || value.toLowerCase().includes(optionText)) {
          element.value = option.value;
          element.dispatchEvent(new Event('change', { bubbles: true }));
          return;
        }
      });
      break;
  }
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fillForm') {
    const filledCount = fillForm(request.profile, request.template, request.useAI);
    sendResponse({ success: true, fieldsCount: filledCount });
  } else if (request.action === 'detectForm') {
    const fieldsCount = detectFormFields();
    sendResponse({ success: true, fieldsCount: fieldsCount });
  }
  return true; // Keep the message channel open for asynchronous response
});

// Auto-fill on page load if enabled
chrome.storage.sync.get(['settings', 'profiles'], function(data) {
  const settings = data.settings || { autoFill: false };
  
  if (settings.autoFill && data.profiles && data.profiles.length > 0) {
    // Use the first profile by default for auto-fill
    const defaultProfile = data.profiles[0];
    
    // Wait for the form to fully load
    setTimeout(() => {
      fillForm(defaultProfile, {}, settings.aiAssist);
    }, 1500);
  }
});

// Add a floating button for quick access
function addQuickAccessButton() {
  const button = document.createElement('div');
  button.className = 'smart-form-scholar-button';
  button.innerHTML = `
    <div class="smart-form-scholar-icon">SFS</div>
  `;
  
  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    .smart-form-scholar-button {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9999;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background-color: #4285f4;
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
      transition: transform 0.2s;
    }
    
    .smart-form-scholar-button:hover {
      transform: scale(1.05);
    }
    
    .smart-form-scholar-icon {
      color: white;
      font-weight: bold;
      font-size: 14px;
    }
  `;
  
  document.head.appendChild(style);
  document.body.appendChild(button);
  
  // Add click event to the button
  button.addEventListener('click', function() {
    chrome.runtime.sendMessage({ action: 'openPopup' });
  });
}

// Initialize
window.addEventListener('load', function() {
  setTimeout(() => {
    detectFormFields();
    addQuickAccessButton();
  }, 1000);
});

// Watch for dynamic form changes (e.g., multi-page forms)
const observer = new MutationObserver(function(mutations) {
  mutations.forEach(function(mutation) {
    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      // If new elements were added, re-detect fields
      setTimeout(() => {
        detectFormFields();
      }, 500);
    }
  });
});

observer.observe(document.body, { childList: true, subtree: true });