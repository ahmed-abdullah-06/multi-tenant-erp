const BUTTON_STYLE = 'padding: 8px 16px; border: none; cursor: pointer; border-radius: 4px;';

function createModal(title, message, inputValue, includeInput) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';

  const modal = document.createElement('div');
  modal.style.cssText = 'background: var(--bg-surface, #fff); padding: 24px; border-radius: 8px; width: 400px; max-width: 90%; box-shadow: 0 10px 25px rgba(0,0,0,0.2);';

  const heading = document.createElement('h3');
  heading.textContent = title;
  heading.style.cssText = 'margin-top: 0; margin-bottom: 16px;';
  modal.appendChild(heading);

  if (message) {
    const body = document.createElement('p');
    body.textContent = message;
    body.style.cssText = 'margin: 0 0 20px;';
    modal.appendChild(body);
  }

  let input;
  if (includeInput) {
    input = document.createElement('input');
    input.type = 'text';
    input.value = inputValue;
    input.style.cssText = 'width: 100%; padding: 8px; margin-bottom: 20px; box-sizing: border-box;';
    modal.appendChild(input);
  }

  const actions = document.createElement('div');
  actions.style.cssText = 'display: flex; justify-content: flex-end; gap: 10px;';
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.textContent = 'Cancel';
  cancel.style.cssText = `${BUTTON_STYLE} background: #eee;`;
  const submit = document.createElement('button');
  submit.type = 'button';
  submit.textContent = includeInput ? 'Submit' : 'Confirm';
  submit.style.cssText = `${BUTTON_STYLE} background: #2196F3; color: white;`;
  actions.append(cancel, submit);
  modal.appendChild(actions);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  return { overlay, input, cancel, submit };
}

function closeModal(overlay, value, resolve) {
  overlay.remove();
  resolve(value);
}

export const ui = {
  showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px;';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const bgColors = { success: '#4CAF50', error: '#F44336', info: '#2196F3' };
    toast.style.cssText = `background: ${bgColors[type] || bgColors.info}; color: white; padding: 12px 20px; border-radius: 4px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); font-family: sans-serif; opacity: 0; transition: opacity 0.3s ease;`;
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = '1'; });
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  showPrompt(title, defaultValue = '') {
    return new Promise((resolve) => {
      const { overlay, input, cancel, submit } = createModal(title, '', defaultValue, true);
      const close = (value) => closeModal(overlay, value, resolve);
      cancel.onclick = () => close(null);
      submit.onclick = () => close(input.value);
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') close(input.value);
        if (event.key === 'Escape') close(null);
      });
      input.focus();
    });
  },

  showConfirm(message, title = 'Confirm action') {
    return new Promise((resolve) => {
      const { overlay, cancel, submit } = createModal(title, message, '', false);
      const close = (value) => closeModal(overlay, value, resolve);
      cancel.onclick = () => close(false);
      submit.onclick = () => close(true);
      overlay.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') close(false);
      });
      submit.focus();
    });
  }
};
