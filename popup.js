document.addEventListener('DOMContentLoaded', function() {
    // Tab switching
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
  
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Remove active class from all tabs
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.style.display = 'none');
        
        // Add active class to clicked tab
        button.classList.add('active');
        const tabId = button.dataset.tab + '-tab';
        document.getElementById(tabId).style.display = 'block';
      });
    });
  
    // Load profiles from storage
    loadProfiles();
  
    // Event listeners for profile management
    document.getElementById('new-profile-btn').addEventListener('click', createNewProfile);
    document.getElementById('save-profile-btn').addEventListener('click', saveProfile);
    document.getElementById('delete-profile-btn').addEventListener('click', deleteProfile);
    document.getElementById('profile-select').addEventListener('change', loadProfileData);
    
    // Template buttons
    const templateButtons = document.querySelectorAll('.apply-template-btn');
    templateButtons.forEach(button => {
      button.addEventListener('click', function() {
        const templateName = this.previousElementSibling.querySelector('h4').textContent;
        applyTemplate(templateName);
      });
    });
  
    // Settings toggles and buttons
    document.getElementById('export-data-btn').addEventListener('click', exportData);
    document.getElementById('import-data-btn').addEventListener('click', importData);
    document.getElementById('clear-data-btn').addEventListener('click', clearData);
    
    // Form filling button
    document.getElementById('fill-form-btn').addEventListener('click', fillCurrentForm);
  
    // Initialize settings from storage
    loadSettings();
  });
  
  // Profile Management
  function loadProfiles() {
    chrome.storage.sync.get('profiles', function(data) {
      const profiles = data.profiles || [];
      const select = document.getElementById('profile-select');
      
      // Clear existing options except the first one
      while (select.options.length > 1) {
        select.remove(1);
      }
      
      // Add profiles to select dropdown
      profiles.forEach(profile => {
        const option = document.createElement('option');
        option.value = profile.id;
        option.textContent = profile.name;
        select.appendChild(option);
      });
    });
  }
  
  function createNewProfile() {
    // Clear form fields
    document.getElementById('profile-name').value = '';
    document.getElementById('first-name').value = '';
    document.getElementById('last-name').value = '';
    document.getElementById('email').value = '';
    document.getElementById('phone').value = '';
    document.getElementById('university').value = '';
    document.getElementById('student-id').value = '';
    document.getElementById('major').value = '';
    document.getElementById('graduation-year').value = '';
    document.getElementById('gpa').value = '';
    
    // Reset profile selector
    document.getElementById('profile-select').value = '';
    
    // Show success message
    showStatus('Ready to create a new profile');
  }
  
  function saveProfile() {
    const profileName = document.getElementById('profile-name').value.trim();
    
    if (!profileName) {
      showStatus('Please enter a profile name', true);
      return;
    }
    
    const profileData = {
      id: document.getElementById('profile-select').value || Date.now().toString(),
      name: profileName,
      personal: {
        firstName: document.getElementById('first-name').value.trim(),
        lastName: document.getElementById('last-name').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim()
      },
      academic: {
        university: document.getElementById('university').value.trim(),
        studentId: document.getElementById('student-id').value.trim(),
        major: document.getElementById('major').value.trim(),
        graduationYear: document.getElementById('graduation-year').value.trim(),
        gpa: document.getElementById('gpa').value.trim()
      }
    };
    
    chrome.storage.sync.get('profiles', function(data) {
      const profiles = data.profiles || [];
      
      // Check if we're updating an existing profile
      const existingIndex = profiles.findIndex(p => p.id === profileData.id);
      
      if (existingIndex >= 0) {
        profiles[existingIndex] = profileData;
      } else {
        profiles.push(profileData);
      }
      
      chrome.storage.sync.set({ profiles }, function() {
        loadProfiles();
        document.getElementById('profile-select').value = profileData.id;
        showStatus('Profile saved successfully');
      });
    });
  }
  
  function deleteProfile() {
    const profileId = document.getElementById('profile-select').value;
    
    if (!profileId) {
      showStatus('No profile selected', true);
      return;
    }
    
    if (confirm('Are you sure you want to delete this profile?')) {
      chrome.storage.sync.get('profiles', function(data) {
        const profiles = data.profiles || [];
        const filteredProfiles = profiles.filter(p => p.id !== profileId);
        
        chrome.storage.sync.set({ profiles: filteredProfiles }, function() {
          loadProfiles();
          createNewProfile();
          showStatus('Profile deleted');
        });
      });
    }
  }
  
  function loadProfileData() {
    const profileId = document.getElementById('profile-select').value;
    
    if (!profileId) {
      createNewProfile();
      return;
    }
    
    chrome.storage.sync.get('profiles', function(data) {
      const profiles = data.profiles || [];
      const profile = profiles.find(p => p.id === profileId);
      
      if (profile) {
        document.getElementById('profile-name').value = profile.name;
        document.getElementById('first-name').value = profile.personal.firstName || '';
        document.getElementById('last-name').value = profile.personal.lastName || '';
        document.getElementById('email').value = profile.personal.email || '';
        document.getElementById('phone').value = profile.personal.phone || '';
        document.getElementById('university').value = profile.academic.university || '';
        document.getElementById('student-id').value = profile.academic.studentId || '';
        document.getElementById('major').value = profile.academic.major || '';
        document.getElementById('graduation-year').value = profile.academic.graduationYear || '';
        document.getElementById('gpa').value = profile.academic.gpa || '';
        
        showStatus('Profile loaded');
      }
    });
  }
  
  // Template Management
  function applyTemplate(templateName) {
    let template = {};
    
    switch(templateName) {
      case 'Scholarship Application':
        template = {
          name: 'Scholarship Application',
          fields: {
            'academic.gpa': true,
            'academic.major': true,
            'academic.graduationYear': true,
            'academic.university': true,
            'personal.firstName': true,
            'personal.lastName': true,
            'personal.email': true,
            'personal.phone': true
          }
        };
        break;
      case 'Internship Application':
        template = {
          name: 'Internship Application',
          fields: {
            'academic.major': true,
            'academic.graduationYear': true, 
            'academic.university': true,
            'personal.firstName': true,
            'personal.lastName': true,
            'personal.email': true,
            'personal.phone': true
          }
        };
        break;
      case 'Course Registration':
        template = {
          name: 'Course Registration',
          fields: {
            'academic.studentId': true,
            'academic.major': true,
            'personal.firstName': true,
            'personal.lastName': true,
            'personal.email': true
          }
        };
        break;
      case 'Research Participation':
        template = {
          name: 'Research Participation',
          fields: {
            'academic.major': true,
            'academic.graduationYear': true,
            'personal.firstName': true,
            'personal.lastName': true,
            'personal.email': true,
            'personal.phone': true
          }
        };
        break;
    }
    
    chrome.storage.sync.set({ currentTemplate: template }, function() {
      showStatus(`Template '${templateName}' applied`);
      
      // Switch to Profiles tab
      document.querySelector('.tab-btn[data-tab="profiles"]').click();
    });
  }
  
  // Settings Management
  function loadSettings() {
    chrome.storage.sync.get({
      settings: {
        autoFill: true,
        aiAssist: true,
        calendarSync: false
      }
    }, function(data) {
      document.getElementById('auto-fill-toggle').checked = data.settings.autoFill;
      document.getElementById('ai-assist-toggle').checked = data.settings.aiAssist;
      document.getElementById('calendar-sync-toggle').checked = data.settings.calendarSync;
    });
    
    // Add event listeners for toggles
    document.getElementById('auto-fill-toggle').addEventListener('change', updateSettings);
    document.getElementById('ai-assist-toggle').addEventListener('change', updateSettings);
    document.getElementById('calendar-sync-toggle').addEventListener('change', updateSettings);
  }
  
  function updateSettings() {
    const settings = {
      autoFill: document.getElementById('auto-fill-toggle').checked,
      aiAssist: document.getElementById('ai-assist-toggle').checked,
      calendarSync: document.getElementById('calendar-sync-toggle').checked
    };
    
    chrome.storage.sync.set({ settings }, function() {
      showStatus('Settings updated');
    });
  }
  
  function exportData() {
    chrome.storage.sync.get(null, function(data) {
      const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'smart-form-scholar-backup.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showStatus('Data exported successfully');
    });
  }
  
  function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = function(event) {
      const file = event.target.files[0];
      const reader = new FileReader();
      
      reader.onload = function(e) {
        try {
          const data = JSON.parse(e.target.result);
          
          chrome.storage.sync.set(data, function() {
            loadProfiles();
            loadSettings();
            showStatus('Data imported successfully');
          });
        } catch (error) {
          showStatus('Invalid backup file', true);
        }
      };
      
      reader.readAsText(file);
    };
    
    input.click();
  }
  
  function clearData() {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      chrome.storage.sync.clear(function() {
        loadProfiles();
        loadSettings();
        createNewProfile();
        showStatus('All data cleared');
      });
    }
  }
  
  // Form Filling
  function fillCurrentForm() {
    const profileId = document.getElementById('profile-select').value;
    
    if (!profileId) {
      showStatus('Please select a profile first', true);
      return;
    }
    
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0] && tabs[0].url.includes('docs.google.com/forms')) {
        chrome.storage.sync.get(['profiles', 'currentTemplate', 'settings'], function(data) {
          const profiles = data.profiles || [];
          const profile = profiles.find(p => p.id === profileId);
          const template = data.currentTemplate || { fields: {} };
          const settings = data.settings || { aiAssist: true };
          
          if (profile) {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: 'fillForm',
              profile: profile,
              template: template,
              useAI: settings.aiAssist
            }, function(response) {
              if (response && response.success) {
                showStatus(`Form filled with ${response.fieldsCount} fields`);
              } else {
                showStatus('Error filling form', true);
              }
            });
          }
        });
      } else {
        showStatus('No Google Form detected in this tab', true);
      }
    });
  }
  
  // Helper Functions
  function showStatus(message, isError = false) {
    const statusElement = document.getElementById('status-message');
    statusElement.textContent = message;
    statusElement.style.color = isError ? 'var(--danger-color)' : 'var(--text-secondary)';
    
    // Clear message after 3 seconds
    setTimeout(() => {
      statusElement.textContent = '';
    }, 3000);
  }