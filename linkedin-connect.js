(() => {
  const config = {
    // Timing (milliseconds)
    scrollDelay: 2000,
    actionDelay: 2500,
    modalDelay: 1500,
    nextPageDelay: 4000,

    // Limits: -1 means no limit
    maxRequests: -1,

    // Note settings
    addNote: true,
    // Use {{name}} for first name, {{fullName}} for full name parsed from aria-label
    note: "Hey {{name}}, I'm looking forward to connecting with you!",

    // Selectors
    connectButtonSelectors: [
      'a[href*="/preload/search-custom-invite/"]',
    ],
    nextPageSelector: '.artdeco-pagination__button--next',
    modalSelector: '[role="dialog"], .artdeco-modal, .artdeco-modal-overlay',
    addNoteButtonText: /^(Add a note|Add note)$/i,
    sendButtonText: /^(Send|Connect)$/i,
    doneButtonText: /^(Done|Got it)$/i,
    dismissButtonSelector:
      '.artdeco-modal__dismiss, button[aria-label="Dismiss"], [data-test-modal-close-btn]',
  };

  const state = {
    isRunning: false,
    isPaused: false,
    shouldStop: false,
    totalRequestsSent: 0,
    pageRequestsSent: 0,
    pageIndex: 0,
    pageButtonTotal: 0,
    pageButtons: [],
    connectNames: [],
  };

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const getText = (element) =>
    (element && (element.innerText || element.textContent || "")).trim();

  const isVisible = (element) => {
    if (!element) return false;
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      Number(style.opacity) > 0 &&
      rect.width > 0 &&
      rect.height > 0
    );
  };

  const isDisabled = (element) =>
    element.disabled === true ||
    element.getAttribute("aria-disabled") === "true" ||
    element.getAttribute("disabled") === "true" ||
    element.classList.contains("disabled") ||
    element.classList.contains("artdeco-button--disabled");

  const queryAll = (selector) => [...document.querySelectorAll(selector)];

  const findVisibleByText = (selector, pattern, root = document) => {
    const elements = [...root.querySelectorAll(selector)];
    return elements.find((el) => {
      const text = getText(el);
      return pattern.test(text) && isVisible(el) && !isDisabled(el);
    });
  };

  const getConnectButtons = () => {
    let buttons = [];

    // Primary: LinkedIn search results use anchor tags with a custom-invite href.
    for (const selector of config.connectButtonSelectors) {
      buttons = queryAll(selector).filter(
        (el) => isVisible(el) && !isDisabled(el)
      );
      if (buttons.length > 0) break;
    }

    // Fallback: any visible clickable with trimmed text exactly "Connect".
    if (buttons.length === 0) {
      buttons = [...queryAll('a, button, [role="button"]')].filter((el) => {
        if (!isVisible(el) || isDisabled(el)) return false;
        const text = getText(el);
        return text === "Connect";
      });
    }

    return buttons;
  };

  const extractNameFromAria = (button) => {
    const ariaLabel = button.getAttribute("aria-label") || "";
    const match = ariaLabel.match(/^Invite\s+(.+?)\s+to\s+connect$/i);
    if (match && match[1]) {
      const fullName = match[1].trim();
      const firstName = fullName.split(/\s+/)[0];
      return { fullName, firstName };
    }
    return { fullName: "", firstName: "" };
  };

  const extractNameFromCard = (button) => {
    // Walk up a few levels and look for a name heading.
    let card = button.closest(".entity-result, .search-result, [data-chameleon-result-urn]");
    if (!card) card = button.closest("li");

    if (card) {
      const title = card.querySelector(
        '.entity-result__title-text a, .artdeco-entity-lockup__title a, a[href*="/in/"]'
      );
      if (title) {
        const fullName = getText(title).replace(/\s+/g, " ").trim();
        const firstName = fullName.split(/\s+/)[0];
        return { fullName, firstName };
      }
    }

    return { fullName: "", firstName: "" };
  };

  const getName = (button) => {
    let name = extractNameFromAria(button);
    if (!name.firstName) name = extractNameFromCard(button);
    return name;
  };

  const getModal = () => {
    return queryAll(config.modalSelector).find(isVisible);
  };

  const clickDismiss = async () => {
    const modal = getModal();
    if (!modal) return;
    const dismiss = modal.querySelector(config.dismissButtonSelector);
    if (dismiss && isVisible(dismiss) && !isDisabled(dismiss)) {
      dismiss.click();
      await sleep(config.modalDelay);
    }
  };

  const clickAddNote = async (modal, fullName, firstName) => {
    const addNoteBtn = findVisibleByText("button, a", config.addNoteButtonText, modal);
    if (!addNoteBtn) return false;

    addNoteBtn.click();
    console.info("[linkedin-connect] Add a note clicked.");
    await sleep(config.modalDelay);

    // Find the custom message textarea.
    const noteTextBox =
      modal.querySelector("textarea#custom-message") ||
      modal.querySelector('textarea[name="message"]') ||
      modal.querySelector("textarea");

    if (noteTextBox) {
      const message = config.note
        .replace(/{{fullName}}/g, fullName)
        .replace(/{{name}}/g, firstName);
      noteTextBox.value = message;
      noteTextBox.dispatchEvent(new Event("input", { bubbles: true }));
      noteTextBox.dispatchEvent(new Event("change", { bubbles: true }));
      console.info("[linkedin-connect] Note pasted.");
      await sleep(config.modalDelay);
    } else {
      console.warn("[linkedin-connect] Note textarea not found.");
    }

    return true;
  };

  const clickSend = async (modal) => {
    const sendBtn = findVisibleByText("button, a", config.sendButtonText, modal);
    if (sendBtn) {
      sendBtn.click();
      console.info("[linkedin-connect] Send clicked.");
      await sleep(config.modalDelay);
      return true;
    }

    // Some modals have a "Done" or "Got it" button after sending.
    const doneBtn = findVisibleByText("button, a", config.doneButtonText, modal);
    if (doneBtn) {
      doneBtn.click();
      await sleep(config.modalDelay);
      return true;
    }

    return false;
  };

  const clickConnectButton = async (button) => {
    button.scrollIntoView({ behavior: "smooth", block: "center" });
    await sleep(300);
    button.click();
    console.info("[linkedin-connect] Connect clicked.");
    await sleep(config.modalDelay);
  };

  const sendInvite = async (button) => {
    const { fullName, firstName } = getName(button);
    console.info(`[linkedin-connect] Sending invite to ${fullName || firstName || "unknown"}.`);

    await clickConnectButton(button);

    const modal = getModal();
    if (!modal) {
      console.warn("[linkedin-connect] No modal appeared after clicking Connect.");
      return false;
    }

    if (config.addNote && config.note) {
      const addedNote = await clickAddNote(modal, fullName, firstName);
      if (!addedNote) {
        console.info("[linkedin-connect] Add a note option not present, sending without note.");
      }
    }

    const sent = await clickSend(modal);
    if (!sent) {
      console.warn("[linkedin-connect] Send button not found; closing modal.");
      await clickDismiss();
      return false;
    }

    return true;
  };

  const compile = () => {
    const buttons = getConnectButtons();
    state.pageButtons = buttons;
    state.pageButtonTotal = buttons.length;
    state.pageButtonIndex = 0;
    state.pageRequestsSent = 0;
    state.connectNames = buttons.map((btn) => getName(btn));

    console.info(`[linkedin-connect] Found ${state.pageButtonTotal} connect button(s).`);

    if (buttons.length === 0) {
      console.warn("[linkedin-connect] No connect buttons found on this page.");
    }
  };

  const scrollToBottom = async () => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    await sleep(config.scrollDelay);
  };

  const scrollToTop = async () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    await sleep(config.scrollDelay);
  };

  const sendInvites = async () => {
    while (state.pageButtonIndex < state.pageButtonTotal) {
      if (state.shouldStop) return "stopped";
      await waitWhilePaused();
      if (state.shouldStop) return "stopped";

      if (config.maxRequests === 0) {
        console.info("[linkedin-connect] Max requests reached.");
        return "maxReached";
      }

      const button = state.pageButtons[state.pageButtonIndex];
      const success = await sendInvite(button);

      if (success) {
        state.pageRequestsSent += 1;
        state.totalRequestsSent += 1;
        if (config.maxRequests > 0) config.maxRequests -= 1;
        console.info(
          `[linkedin-connect] Invite sent: ${state.pageRequestsSent}/${state.pageButtonTotal} on page, ${state.totalRequestsSent} total.`
        );
      } else {
        console.warn(
          `[linkedin-connect] Failed to send invite ${state.pageButtonIndex + 1}/${state.pageButtonTotal}.`
        );
      }

      state.pageButtonIndex += 1;
      await sleep(config.actionDelay);
    }

    return "pageDone";
  };

  const nextPage = async () => {
    const nextBtn = document.querySelector(config.nextPageSelector);
    if (!nextBtn || isDisabled(nextBtn)) {
      console.info("[linkedin-connect] No next page button found or it is disabled.");
      return false;
    }

    console.info("[linkedin-connect] Navigating to next page...");
    nextBtn.scrollIntoView({ behavior: "smooth", block: "center" });
    await sleep(500);
    nextBtn.click();
    await sleep(config.nextPageDelay);
    return true;
  };

  const waitWhilePaused = async () => {
    while (state.isPaused && !state.shouldStop) {
      await sleep(250);
    }
  };

  const run = async () => {
    if (state.isRunning) {
      console.info("[linkedin-connect] Already running.");
      return;
    }

    state.isRunning = true;
    state.shouldStop = false;
    state.isPaused = false;

    try {
      console.info("[linkedin-connect] Starting...");

      while (!state.shouldStop) {
        await waitWhilePaused();
        if (state.shouldStop) break;

        await scrollToBottom();
        await scrollToTop();

        compile();

        const result = await sendInvites();

        if (result === "stopped" || result === "maxReached") {
          break;
        }

        const hasNext = await nextPage();
        if (!hasNext) {
          console.info("[linkedin-connect] No more pages.");
          break;
        }
      }

      console.info(
        `[linkedin-connect] Done. Total connection requests sent: ${state.totalRequestsSent}.`
      );
    } finally {
      state.isRunning = false;
    }
  };

  const pause = () => {
    state.isPaused = true;
    console.info("[linkedin-connect] Paused. Run window.linkedinConnect.resume() to continue.");
  };

  const resume = () => {
    if (!state.isPaused) {
      console.info("[linkedin-connect] Not paused.");
      return;
    }
    state.isPaused = false;
    state.shouldStop = false;
    console.info("[linkedin-connect] Resumed.");
  };

  const stop = () => {
    state.shouldStop = true;
    state.isPaused = false;
    console.info("[linkedin-connect] Stopping...");
  };

  window.linkedinConnect = {
    config,
    state,
    run,
    pause,
    resume,
    stop,
    getConnectButtons,
  };

  console.info("[linkedin-connect] Loaded. Run window.linkedinConnect.run() to start.");
})();
