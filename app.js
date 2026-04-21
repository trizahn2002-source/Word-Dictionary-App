// ===== DOM SELECTORS =====
const searchForm = document.getElementById('search-form');
const wordInput  = document.getElementById('word-input');
const errorMsg   = document.getElementById('error-msg');
const loader     = document.getElementById('loader');
const wordCard   = document.getElementById('word-card');

// ===== EVENT LISTENERS =====
searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const query = wordInput.value.trim();
  if (!query) {
    showError('Please enter a word to search.');
    return;
  }
  searchWord(query);
});

// ===== FETCH FUNCTION =====
async function searchWord(word) {
  clearError();
  showLoader();
  hideCard();

  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`No results found for "${word}". Try a different spelling.`);
      }
      throw new Error('Something went wrong. Please try again.');
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      throw new Error(`No definition found for "${word}".`);
    }

    displayResults(data[0]);

  } catch (err) {
    showError(err.message || 'An unexpected error occurred.');
  } finally {
    hideLoader();
  }
}

// ===== DISPLAY RESULTS =====
function displayResults(entry) {
  const { word, phonetic, phonetics, meanings, sourceUrls } = entry;

  const audioUrl = phonetics?.find(p => p.audio)?.audio || null;
  const phoneticText = phonetic || phonetics?.find(p => p.text)?.text || '';

  let html = `
    <div class="word-header">
      <h1 class="word-title">${escapeHTML(word)}</h1>
      ${audioUrl ? `
        <button class="audio-btn" id="audio-btn" aria-label="Listen to pronunciation">
          <span class="audio-icon">🔊</span> Listen
        </button>
      ` : ''}
    </div>

    ${phoneticText ? `<span class="word-phonetic">${escapeHTML(phoneticText)}</span>` : ''}
    <hr class="card-divider"/>

    <ul class="meanings-list">
      ${meanings.map(meaning => buildMeaningHTML(meaning)).join('')}
    </ul>

    ${sourceUrls && sourceUrls.length > 0 ? `
      <hr class="card-divider"/>
      <p class="source-block">
        Source: <a href="${sourceUrls[0]}" target="_blank" rel="noopener noreferrer">${sourceUrls[0]}</a>
      </p>
    ` : ''}
  `;

  wordCard.innerHTML = html;
  wordCard.classList.remove('hidden');

  if (audioUrl) {
    const audioBtn = document.getElementById('audio-btn');
    audioBtn.addEventListener('click', () => playAudio(audioUrl, audioBtn));
  }

  document.querySelectorAll('.synonym-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      wordInput.value = tag.dataset.word;
      searchWord(tag.dataset.word);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

// ===== BUILD MEANING HTML =====
function buildMeaningHTML(meaning) {
  const { partOfSpeech, definitions, synonyms } = meaning;
  const topDefs = definitions.slice(0, 4);

  let allSynonyms = [...(synonyms || [])];
  definitions.forEach(d => {
    if (d.synonyms) allSynonyms = allSynonyms.concat(d.synonyms);
  });
  allSynonyms = [...new Set(allSynonyms)].slice(0, 8);

  return `
    <li class="meaning-block">
      <span class="part-of-speech">${escapeHTML(partOfSpeech)}</span>
      <ol class="definitions-list">
        ${topDefs.map(def => `
          <li>
            ${escapeHTML(def.definition)}
            ${def.example ? `<em class="example-sentence">"${escapeHTML(def.example)}"</em>` : ''}
          </li>
        `).join('')}
      </ol>
      ${allSynonyms.length > 0 ? `
        <div class="synonyms-block">
          <span class="synonyms-label">Synonyms</span>
          <div class="synonyms-list">
            ${allSynonyms.map(syn => `
              <button class="synonym-tag" data-word="${escapeHTML(syn)}">${escapeHTML(syn)}</button>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </li>
  `;
}

// ===== AUDIO =====
function playAudio(url, btn) {
  const audio = new Audio(url);
  btn.textContent = '🔊 Playing...';
  btn.disabled = true;
  audio.play().catch(() => showError('Could not play audio.'));
  audio.addEventListener('ended', () => {
    btn.innerHTML = '<span class="audio-icon">🔊</span> Listen';
    btn.disabled = false;
  });
}

// ===== UI HELPERS =====
function showLoader() { loader.classList.remove('hidden'); }
function hideLoader() { loader.classList.add('hidden'); }
function hideCard() { wordCard.classList.add('hidden'); wordCard.innerHTML = ''; }
function showError(message) { errorMsg.textContent = message; errorMsg.classList.add('visible'); }
function clearError() { errorMsg.textContent = ''; errorMsg.classList.remove('visible'); }

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}