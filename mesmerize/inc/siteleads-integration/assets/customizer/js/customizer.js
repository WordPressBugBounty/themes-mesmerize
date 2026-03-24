(function ($) {
  function getSiteLeadsBackendData(path, defaultValue) {
    return _.get(top.mesmerizeSiteLeadsCustomizerData, path, defaultValue);
  }
  function getTranslatedText(name) {
    return getSiteLeadsBackendData(['translations', name], '');
  }
  function getWithThemePrefix(path) {
    let themePrefix = getSiteLeadsBackendData('themePrefix');
    return themePrefix + path;
  }
  const PLUGIN_STATUSES = {
    NOT_INSTALLED: 'not-installed',
    INSTALLED: 'installed',
    ACTIVE: 'active'
  };
  const phoneNumberWpSettingId = getWithThemePrefix('siteleads_number');
  const showContactPhoneWpSettingId = getWithThemePrefix('show_contact_phone');
  const sectionName = getWithThemePrefix('contact_settings');
  let buttonNode = null;
  let phoneInputNode = null;
  let requestIsPending = false;
  let pluginSettingUrl = getSiteLeadsBackendData('pluginSettingsUrl', '#');
  let isLoading = false;
  const setIsLoadingText = text => {
    const infoNoticeNode = document.querySelector('.mesmerize-siteleads-integration-button__notice--info');
    if (!infoNoticeNode) {
      return;
    }
    infoNoticeNode.style.display = 'flex';
    const spinner = document.createElement('span');
    spinner.classList.add('spinner');
    spinner.classList.add('is-active');
    const textSpan = document.createElement('span');
    textSpan.innerHTML = text;
    infoNoticeNode.innerHTML = '';
    infoNoticeNode.appendChild(spinner);
    infoNoticeNode.appendChild(textSpan);
  };
  const hideInfoNotice = () => {
    const infoNoticeNode = document.querySelector('.mesmerize-siteleads-integration-button__notice--info');
    if (!infoNoticeNode) {
      return;
    }
    infoNoticeNode.style.display = 'none';
  };
  const setIsLoading = newValue => {
    const buttonNode = document.querySelector('.mesmerize-siteleads-integration-button');
    if (!buttonNode) {
      return;
    }
    if (newValue) {
      buttonNode.classList.add('mesmerize-loading');
    } else {
      buttonNode.classList.remove('mesmerize-loading');
      hideInfoNotice();
    }
  };
  let errorMessage = false;
  const setErrorMessage = newValue => {
    errorMessage = newValue;
    unUpdateNoticeErrorText();
  };
  let currentStatus = getSiteLeadsBackendData('pluginStatus');
  function setCurrentStatus(newValue) {
    currentStatus = newValue;
    updateControlReactiveData();
  }
  function getButtonLabel() {
    switch (currentStatus) {
      case PLUGIN_STATUSES.ACTIVE:
        return getTranslatedText('install_button_text_active_plugin');
      case PLUGIN_STATUSES.INSTALLED:
        return getTranslatedText('install_button_text_installed_plugin');
      case PLUGIN_STATUSES.NOT_INSTALLED:
        return getTranslatedText('install_button_not_installed_plugin');
      default:
        return 'Error';
    }
  }
  function getNoticeTitle() {
    switch (currentStatus) {
      case PLUGIN_STATUSES.ACTIVE:
        return getTranslatedText('notice_title_active');
      case PLUGIN_STATUSES.INSTALLED:
        return getTranslatedText('notice_title_installed');
      case PLUGIN_STATUSES.NOT_INSTALLED:
        return getTranslatedText('notice_title_not_installed');
      default:
        return 'Error';
    }
  }
  function getNoticeError() {
    if (!errorMessage) {
      return false;
    }
    return 'Error: ' + errorMessage;
  }
  function onUpdateButtonTextAndListeners() {
    buttonNode = document.querySelector('.mesmerize-siteleads-integration-button');
    if (!buttonNode) {
      return;
    }
    buttonNode.innerHTML = getButtonLabel();
    buttonNode.removeEventListener('click', onHandleButtonClick);
    buttonNode.addEventListener('click', onHandleButtonClick);
  }
  function onUpdateNoticeText() {
    let noticeNodeContainer = document.querySelector('.mesmerize-siteleads-integration-button__container');
    if (!noticeNodeContainer) {
      return;
    }
    let titleNode = noticeNodeContainer.querySelector('.mesmerize-siteleads-integration-button__title');
    titleNode.innerHTML = getNoticeTitle();
    const titleSiteLeadsSpan = document.createElement('span');
    titleSiteLeadsSpan.innerHTML = 'SiteLeads';
    titleNode.innerHTML += '&nbsp;' + titleSiteLeadsSpan.outerHTML;
    titleNode.innerHTML += '&nbsp;' + getTranslatedText('plugin_text');
    let descriptionNode1 = noticeNodeContainer.querySelector('.mesmerize-siteleads-integration-button__description_1');
    descriptionNode1.innerHTML = getTranslatedText('notice_description_1');
    let descriptionNode2 = noticeNodeContainer.querySelector('.mesmerize-siteleads-integration-button__description_2');
    descriptionNode2.innerHTML = getTranslatedText('notice_description_2');
    let descriptionNode3 = noticeNodeContainer.querySelector('.mesmerize-siteleads-integration-button__description_3');
    descriptionNode3.innerHTML = getTranslatedText('notice_description_3');
  }
  function unUpdateNoticeErrorText() {
    hideInfoNotice();
    let noticeErrorNode = document.querySelector('.mesmerize-siteleads-integration-button__notice--error');
    if (!noticeErrorNode) {
      return;
    }
    let error = getNoticeError();
    if (error) {
      noticeErrorNode.innerHTML = error;
      noticeErrorNode.style.display = 'block';
    } else {
      noticeErrorNode.style.display = 'none';
    }
  }
  function onUpdatePhoneInput() {
    phoneInputNode = document.querySelector('#_customize-input-' + getWithThemePrefix('siteleads_number'));
    if (!phoneInputNode) {
      return;
    }
    if (currentStatus === PLUGIN_STATUSES.ACTIVE) {
      phoneInputNode.setAttribute('disabled', 'disabled');
      return;
    }
    phoneInputNode.removeAttribute('disabled');
  }
  function updateControlReactiveData() {
    onUpdateButtonTextAndListeners();
    onUpdateNoticeText();
    onUpdatePhoneInput();
  }
  const onInstallSiteLeadsPlugin = async () => {
    const slug = getSiteLeadsBackendData('pluginSlug');
    const promise = new Promise((resolve, reject) => {
      wp.updates.ajax("install-plugin", {
        slug: slug,
        success: () => {
          resolve();
        },
        error: e => {
          if ('folder_exists' === e.errorCode) {
            resolve();
          } else {
            reject();
          }
        }
      });
    });
    try {
      setIsLoadingText(getTranslatedText('info_notice_installing'));
      const result = await promise;
      setCurrentStatus(PLUGIN_STATUSES.INSTALLED);
      return true;
    } catch (e) {
      setErrorMessage(getTranslatedText('error_could_not_install_plugin'));
      console.error(e);
      return false;
    }
  };
  const onActivateSiteLeads = async () => {
    const activationUrl = getSiteLeadsBackendData('activationLink');
    let promise = new Promise(async (resolve, reject) => {
      try {
        let result = await fetch(activationUrl);
        if (!result?.ok) {
          reject(result?.statusText);
        }
        resolve();
      } catch (e) {
        reject(e);
      }
    });
    try {
      setIsLoadingText(getTranslatedText('info_notice_activating'));
      const result = await promise;
      setCurrentStatus(PLUGIN_STATUSES.ACTIVE);
      await initSetupForSiteLeadsPlugin();
      wp.customize.previewer.save();
      return true;
    } catch (e) {
      setErrorMessage(getTranslatedText('error_could_not_activate_plugin'));
      console.error(e);
      return false;
    }
  };
  function getWpValue(path) {
    return top.wp.customize(path).get();
  }
  ;
  const initSetupForSiteLeadsPlugin = async () => {
    const ajaxHandle = getSiteLeadsBackendData('siteLeadsInitWpAjaxHandle');
    const phoneNumber = getWpValue(phoneNumberWpSettingId) || '';
    const nonce = getSiteLeadsBackendData('siteLeadsNonce');
    const promise = new Promise((resolve, reject) => {
      wp.ajax.post(ajaxHandle, {
        phone: phoneNumber,
        _wpnonce: nonce
      }).done(response => {
        resolve(response);
      }).fail(error => {
        reject(error);
      });
    });
    try {
      setIsLoadingText(getTranslatedText('info_notice_init'));
      const result = await promise;
      wp.customize.previewer.refresh();
      return result;
    } catch (e) {
      setErrorMessage(getTranslatedText('error_could_not_init_plugin_data'));
      console.error(e);
      return false;
    }
  };
  const getWidgetId = () => {
    const iframe = document.querySelector('#customize-preview iframe');
    if (!iframe) {
      return null;
    }
    const iframeDocument = iframe.contentDocument;
    const widget = iframeDocument?.querySelector?.('[data-widget-id]');
    if (!widget) {
      return null;
    }
    ;
    const widgetId = widget.getAttribute('data-widget-id');
    return widgetId;
  };
  const getPluginSettingsUrlBasedOnWidgetIdInPreview = () => {
    const widgetId = getWidgetId();
    if (!widgetId) {
      return pluginSettingUrl;
    }
    const adminUrl = getSiteLeadsBackendData('adminPhpUrl');
    try {
      let widgetSettingsUrl = new URL(adminUrl);
      let searchParams = widgetSettingsUrl.searchParams;
      searchParams.append('page', 'siteleads');
      searchParams.append('inner_page', 'channel-selection');
      searchParams.append('widgetId', widgetId);
      searchParams.append('action', 'edit');
      return widgetSettingsUrl.toString();
    } catch (e) {
      console.error(e);
      return pluginSettingUrl;
    }
  };
  function onRedirectToManageOptions() {
    let href = getPluginSettingsUrlBasedOnWidgetIdInPreview();
    if (!href) {
      return;
    }
    window.open(href, "_blank");
  }
  async function onHandleButtonClick() {
    if (currentStatus === PLUGIN_STATUSES.ACTIVE) {
      onRedirectToManageOptions();
      return;
    }
    if (requestIsPending) {
      return;
    }
    errorMessage = null;
    unUpdateNoticeErrorText();
    requestIsPending = true;
    setIsLoading(true);
    switch (currentStatus) {
      case PLUGIN_STATUSES.NOT_INSTALLED:
        await installAndActivateSiteLeads();
        break;
      case PLUGIN_STATUSES.INSTALLED:
        await onActivateSiteLeads();
        break;
    }
    requestIsPending = false;
    setIsLoading(false);
  }
  ;
  const installAndActivateSiteLeads = async () => {
    try {
      const installResponse = await onInstallSiteLeadsPlugin();
      if (!installResponse) {
        return false;
      }
      const activateResponse = await onActivateSiteLeads();
      if (!activateResponse) {
        return false;
      }
      return true;
    } catch (e) {
      return false;
      // removed by dead control flow

    }
  };
  function addButtonEventListeners() {
    updateControlReactiveData();
  }

  //Siteleads init
  function initApp() {
    let container = document.querySelector('.mesmerize-siteleads-integration-button__container');
    if (!container) {
      return;
    }
    let isLoaded = container.getAttribute('data-loaded', false);
    if (isLoaded === 'true') {
      return;
    }
    container.setAttribute('data-loaded', 'true');
    addButtonEventListeners();

    // Reveal the container now that everything is ready
    container.style.display = 'flex';
  }
  function onAddPanelReflowListener() {
    const parentWP = parent.wp;
    const onUpdate = () => {
      // Check if our specific section is currently active/expanded
      if (parentWP.customize.section(sectionName).expanded()) {
        initApp();
      }
    };
    parentWP.customize.bind('pane-contents-reflowed', onUpdate);
    parentWP.customize?.bind('save', onUpdate);
    setTimeout(() => {
      initApp();
    }, 0);
  }
  $(document).ready(function () {
    onAddPanelReflowListener();
  });
})(jQuery);
