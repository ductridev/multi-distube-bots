// Google Analytics Configuration
(function() {
  // Load Google Analytics gtag script
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=G-0BLYFTCQTT';
  document.head.appendChild(script);

  // Initialize gtag after script loads
  script.onload = function() {
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    window.gtag = gtag; // Make gtag globally available
    
    gtag('js', new Date());
    gtag('config', 'G-0BLYFTCQTT', {
      // Enhanced measurement settings
      page_title: document.title,
      page_location: window.location.href,
      custom_map: {
        'custom_parameter_1': 'language'
      }
    });

    // Track page language
    gtag('event', 'page_view', {
      'custom_parameter_1': document.documentElement.lang || 'en'
    });
  };

  // Make functions globally available immediately
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  window.gtag = gtag;

  // Custom event tracking for music bot interactions
  window.trackEvent = function(eventName, parameters = {}) {
    gtag('event', eventName, {
      event_category: 'BuNgo Bot Interaction',
      event_label: parameters.label || '',
      value: parameters.value || 0,
      ...parameters
    });
  };

  // Track theme changes
  window.trackThemeChange = function(theme) {
    gtag('event', 'theme_change', {
      event_category: 'User Preference',
      event_label: theme,
      custom_parameter_1: document.documentElement.lang || 'en'
    });
  };

  // Track language switches
  window.trackLanguageSwitch = function(fromLang, toLang, destination) {
    gtag('event', 'language_switch', {
      event_category: 'User Preference',
      event_label: `${fromLang} to ${toLang}`,
      destination: destination
    });
  };

  // Track external link clicks
  document.addEventListener('click', function(e) {
    if (e.target.tagName === 'A' && e.target.href) {
      const isExternal = !e.target.href.includes(window.location.hostname);
      if (isExternal) {
        gtag('event', 'click', {
          event_category: 'External Link',
          event_label: e.target.href,
          language: document.documentElement.lang || 'en',
          transport_type: 'beacon'
        });
      }
    }
  });

  // Track bot invite button clicks
  document.addEventListener('click', function(e) {
    if (e.target.closest('a[href*="discord.com/oauth2/authorize"]')) {
      gtag('event', 'bot_invite_click', {
        event_category: 'Bot Interaction',
        event_label: 'Discord Bot Invite',
        language: document.documentElement.lang || 'en'
      });
    }
  });

  // Track form submissions (if any)
  document.addEventListener('submit', function(e) {
    gtag('event', 'form_submit', {
      event_category: 'Form',
      event_label: e.target.action || window.location.pathname
    });
  });
})();
