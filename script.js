let course = {
  id: '', name: '', title: '', description: '', mediaUrl: '', mediaType: 'image',
  language: 'CoBlocks', vocabulary: [], rubric: [], section_groups: [],
  scoring: { criteria: [] }, activities: {}
};
let rubricDrake;

// Helper: Get human-readable checkpoint options.
function getCheckpointOptions() {
  const options = [];
  course.section_groups.forEach(group =>
    group.sections.forEach(section =>
      section.steps.forEach(step =>
        step.stepBlockGroups.forEach(bg =>
          bg.blocks.forEach(blk => {
            if (blk.type === 'checkpoint') {
              let label = step.title || 'Untitled Step';
              if (blk.questionBlocks && blk.questionBlocks.length > 0) {
                const text = blk.questionBlocks[0].text || '';
                label += ' – ' + (text.length > 30 ? text.slice(0, 30) + '…' : text);
              } else {
                label += ' – Checkpoint';
              }
              options.push({ id: blk.id, label });
            }
          })
        )
      )
    )
  );
  return options;
}

// Helper: Get human-readable activity options.
function getActivityOptions() {
  const seen = new Set();
  const options = [];
  course.section_groups.forEach(group =>
    group.sections.forEach(section =>
      section.steps.forEach(step => {
        if (step.activityId && !seen.has(step.activityId)) {
          seen.add(step.activityId);
          const label = step.title || step.activityId;
          options.push({ id: step.activityId, label });
        }
      })
    )
  );
  return options;
}

// Initialize course details in the UI.
function initCourseDetails() {
  document.getElementById('course-id').value = course.id;
  document.getElementById('course-name').value = course.name;
  document.getElementById('course-title').value = course.title;
  document.getElementById('course-description').innerHTML = course.description;
  document.getElementById('media-url').value = course.mediaUrl;
  document.getElementById('language').value = course.language;
  refreshVocabList();
}

// Refresh the vocabulary tag list in the UI.
function refreshVocabList() {
  const list = document.getElementById('vocabulary-list');
  list.innerHTML = '';
  course.vocabulary.forEach((tag, i) => {
    const div = document.createElement('div');
    div.className = 'tag-item';
    const input = document.createElement('input');
    input.value = tag;
    input.addEventListener('input', () => course.vocabulary[i] = input.value);
    const btn = document.createElement('button');
    btn.textContent = '×';
    btn.addEventListener('click', () => {
      course.vocabulary.splice(i, 1);
      refreshVocabList();
    });
    div.append(input, btn);
    list.appendChild(div);
  });
}

// Helper: Create a standard card with header and body (body visible by default).
function createCard(headerText, additionalClass = '') {
  const card = document.createElement('div');
  card.className = 'card' + (additionalClass ? ' ' + additionalClass : '');
  const header = document.createElement('div');
  header.className = 'card-header';
  header.textContent = headerText;
  const body = document.createElement('div');
  body.className = 'card-body';
  // Ensure visible by default.
  body.classList.remove('hidden');
  card.append(header, body);
  return { card, header, body };
}

/**
 * Renders the Rubric section of the curriculum editor.
 * Each rubric item contains fields for type, title, weight, subtitle,
 * and a dynamic list of requirements that support drag-and-drop reordering.
 * Triggers a full re-render after most changes.
 */
function renderRubric() {
  // Ensure every requirement is an object with a unique id.
  course.rubric.forEach(item => {
    item.requirements = item.requirements.map(r => {
      if (typeof r === 'string') return { id: genUUID(), text: r };
      if (!r.id) r.id = genUUID();
      return r;
    });
  });
  const list = document.getElementById('rubric-list');
  list.innerHTML = '';
  course.rubric.forEach((item, idx) => {
    const { card, header, body } = createCard(`Rubric Item ${idx + 1}`, 'rubric-item');
    ['type', 'title'].forEach(field => {
      const fg = document.createElement('div');
      fg.className = 'field-group';
      const label = document.createElement('label');
      label.textContent = field.charAt(0).toUpperCase() + field.slice(1);
      const input = document.createElement('input');
      input.value = item[field];
      input.addEventListener('input', () => item[field] = input.value);
      fg.append(label, input);
      body.append(fg);
    });
    // Weight field (required).
    const fgWeight = document.createElement('div');
    fgWeight.className = 'field-group';
    const labelWeight = document.createElement('label');
    labelWeight.textContent = 'Weight';
    const inputWeight = document.createElement('input');
    inputWeight.type = 'text';
    inputWeight.value = item.weight || '';
    inputWeight.addEventListener('input', () => { item.weight = inputWeight.value; });
    fgWeight.append(labelWeight, inputWeight);
    body.append(fgWeight);

    // Subtitle field (optional).
    const fgSubtitle = document.createElement('div');
    fgSubtitle.className = 'field-group';
    const labelSubtitle = document.createElement('label');
    labelSubtitle.textContent = 'Subtitle (optional)';
    const textareaSubtitle = document.createElement('textarea');
    textareaSubtitle.value = item.subtitle || '';
    textareaSubtitle.addEventListener('input', () => { item.subtitle = textareaSubtitle.value; });
    fgSubtitle.append(labelSubtitle, textareaSubtitle);
    body.append(fgSubtitle);

    const fgReq = document.createElement('div');
    fgReq.className = 'field-group';
    const labelReq = document.createElement('label');
    labelReq.textContent = 'Requirements';
    const ul = document.createElement('ul');
    ul.className = 'requirements-list';
    item.requirements.forEach((req, j) => {
      const li = document.createElement('li');
      // Drag handle for requirement.
      const handle = document.createElement('span');
      handle.className = 'drag-handle';
      handle.textContent = '⋮⋮';
      li.append(handle);
      // Tag for ordering.
      li.dataset.reqId = req.id;

      // Row 1: Text label + input + delete.
      const labelText = document.createElement('label');
      labelText.className = 'text-label';
      labelText.textContent = 'Text';
      const inputR = document.createElement('input');
      inputR.type = 'text';
      inputR.value = req.text;
      inputR.addEventListener('input', () => { req.text = inputR.value; });
      const del = document.createElement('button');
      del.classList.add('delete-req');
      del.textContent = '×';
      del.addEventListener('click', () => { item.requirements.splice(j, 1); renderRubric(); });
      li.append(labelText, inputR, del);

      // Row 2: Audio label + checkbox.
      const audioLabel = document.createElement('label');
      audioLabel.className = 'audio-label';
      audioLabel.textContent = 'Include Audio';
      const audioCheckbox = document.createElement('input');
      audioCheckbox.type = 'checkbox';
      audioCheckbox.className = 'audio-checkbox';
      audioCheckbox.checked = !!req.audioEnabled;
      audioCheckbox.addEventListener('change', () => {
        req.audioEnabled = audioCheckbox.checked;
        if (!req.audioEnabled) delete req.audio;
        renderRubric();
      });
      li.append(audioLabel, audioCheckbox);

      // Row 3: Audio URL label + input (only when audio is enabled).
      if (req.audioEnabled) {
        const urlLabel = document.createElement('label');
        urlLabel.className = 'url-label';
        urlLabel.textContent = 'Audio URL';
        const urlInput = document.createElement('input');
        urlInput.type = 'text';
        urlInput.className = 'url-input';
        urlInput.value = req.audio || '';
        urlInput.addEventListener('input', () => { req.audio = urlInput.value; });
        li.append(urlLabel, urlInput);
      }

      ul.append(li);
    });
    const addR = document.createElement('button');
    addR.textContent = '+ Add Requirement';
    addR.addEventListener('click', () => {
      item.requirements.push({ id: genUUID(), text: '' });
      renderRubric();
    });
    fgReq.append(labelReq, ul, addR);
    body.append(fgReq);
    const ctrl = document.createElement('div');
    ['Move Up', 'Move Down', 'Delete Item'].forEach(text => {
      const btn = document.createElement('button');
      btn.textContent = text;
      btn.addEventListener('click', () => {
        if (text === 'Delete Item') course.rubric.splice(idx, 1);
        else if (text === 'Move Up' && idx > 0) [course.rubric[idx - 1], course.rubric[idx]] = [course.rubric[idx], course.rubric[idx - 1]];
        else if (text === 'Move Down' && idx < course.rubric.length - 1) [course.rubric[idx + 1], course.rubric[idx]] = [course.rubric[idx], course.rubric[idx + 1]];
        renderRubric();
      });
      ctrl.append(btn);
    });
    body.append(ctrl);
    card.append(header, body);
    list.append(card);
  });
  // Initialize dragula for rubric requirements.
  if (rubricDrake) rubricDrake.destroy();
  const reqContainers = Array.from(document.querySelectorAll('.requirements-list'));
  rubricDrake = window.dragula(reqContainers, {
    moves: (el, source, handle) => handle.classList.contains('drag-handle')
  })
    .on('drop', (el, target) => {
      const rubricIdx = Array.from(document.querySelectorAll('.rubric-item'))
        .indexOf(target.closest('.rubric-item'));
      const newOrderIds = Array.from(target.children).map(li => li.dataset.reqId);
      course.rubric[rubricIdx].requirements = newOrderIds
        .map(id => course.rubric[rubricIdx].requirements.find(r => r.id === id))
        .filter(Boolean);
      // Delay re-render to allow Dragula to cleanup mirror.
      setTimeout(renderRubric, 0);
    })
    .on('dragend', () => {
      // Remove any lingering Dragula mirror elements.
      document.querySelectorAll('.gu-mirror').forEach(mirror => mirror.remove());
    });
}

/**
 * Renders all section groups and their nested sections and steps.
 * Steps include UI for block groups and blocks.
 * Automatically updates data bindings and re-renders upon interaction.
 */
function renderSectionGroups() {
  const list = document.getElementById('section-groups-list');
  list.innerHTML = '';
  course.section_groups.forEach((grp, gidx) => {
    // Use createCard helper for the group card
    const { card, header, body } = createCard(`Group ${gidx+1}`, 'section-group-item');

    // Title field group for group title
    const fgG = document.createElement('div');
    fgG.className = 'field-group';
    const labelG = document.createElement('label');
    labelG.textContent = 'Title';
    const inputG = document.createElement('input');
    inputG.value = grp.title;
    inputG.addEventListener('input', () => grp.title = inputG.value);
    fgG.append(labelG, inputG);
    body.append(fgG);

    // Sections List
    const secList = document.createElement('div');
    secList.className = 'section-list';
    grp.sections.forEach((sec, sidx) => {
      const secCard = document.createElement('div');
      secCard.className = 'card section-item';
      // Header
      const secHeader = document.createElement('div');
      secHeader.className = 'card-header';
      secHeader.textContent = `Section ${sidx+1}`;
      secCard.append(secHeader);
      // Title field
      const titleFg = document.createElement('div');
      titleFg.className = 'field-group';
      const titleLabel = document.createElement('label');
      titleLabel.textContent = 'Title';
      const titleInput = document.createElement('input');
      titleInput.value = sec.title;
      titleInput.addEventListener('input', () => sec.title = titleInput.value);
      titleFg.append(titleLabel, titleInput);
      secCard.append(titleFg);
      // Controls
      const secCtrl = document.createElement('div');
      ['↑','↓','×'].forEach(sym => {
        const btn = document.createElement('button');
        btn.textContent = sym;
        btn.className = 'move-btn';
        btn.addEventListener('click', () => {
          const arr = grp.sections;
          if (sym === '×') arr.splice(sidx,1);
          if (sym === '↑' && sidx > 0) [arr[sidx-1],arr[sidx]] = [arr[sidx],arr[sidx-1]];
          if (sym === '↓' && sidx < arr.length - 1) [arr[sidx+1],arr[sidx]] = [arr[sidx],arr[sidx+1]];
          renderSectionGroups();
        });
        secCtrl.append(btn);
      });
      secHeader.append(secCtrl);

      // Steps List
      sec.steps = sec.steps || [];
      const stepList = document.createElement('div');
      stepList.className = 'step-list';
      sec.steps.forEach((step, stidx) => {
        const stepCard = document.createElement('div');
        stepCard.className = 'step-item card';
        const stepHeader = document.createElement('div');
        stepHeader.className = 'card-header';
        stepHeader.textContent = `Step ${stidx+1}`;
        stepHeader.style.fontWeight = 'bold';
        const stepBody = document.createElement('div');
        stepBody.className = 'card-body';

        // Title
        const fgT = document.createElement('div');
        fgT.className = 'field-group';
        const labelT = document.createElement('label');
        labelT.textContent = 'Title';
        const inputT = document.createElement('input');
        inputT.value = step.title;
        // inputA is defined below, so we need to declare inputA before inputT's event handler
        let inputA;
        inputT.addEventListener('input', () => {
          step.title = inputT.value;
          if (step.generateId) {
            step.activityId = step.title.toLowerCase().replace(/\s+/g, '_');
            if (inputA) inputA.value = step.activityId;
          }
        });
        fgT.append(labelT, inputT);
        stepBody.append(fgT);

        // Activity ID (show input only when checked)
        const fgA = document.createElement('div');
        fgA.className = 'field-group align-baseline';
        const lblA = document.createElement('label');
        lblA.textContent = 'Activity ID';
        // Checkbox
        const chkA = document.createElement('input');
        chkA.type = 'checkbox';
        chkA.checked = step.generateId || false;
        chkA.addEventListener('change', () => {
          step.generateId = chkA.checked;
          if (step.generateId) {
            step.activityId = (step.title || '').toLowerCase().replace(/\s+/g, '_');
            inputA.value = step.activityId;
            inputA.style.display = 'inline-block';
          } else {
            inputA.style.display = 'none';
            delete step.activityId;
          }
          renderSectionGroups();
        });
        // Text input (hidden unless checkbox is checked)
        inputA = document.createElement('input');
        inputA.type = 'text';
        inputA.value = step.activityId || '';
        inputA.style.display = chkA.checked ? 'inline-block' : 'none';
        inputA.style.marginLeft = '8px';
        inputA.addEventListener('input', () => {
          step.activityId = inputA.value;
          renderActivities();
        });
        fgA.append(lblA, chkA, inputA);
        stepBody.append(fgA);

        // Teacher Only
        const fgTO = document.createElement('div');
        fgTO.className = 'field-group align-baseline';
        const lblTO = document.createElement('label');
        lblTO.textContent = 'Teacher Only';
        const chkTO = document.createElement('input');
        chkTO.type = 'checkbox';
        chkTO.checked = step.teacherOnly || false;
        chkTO.addEventListener('change', () => step.teacherOnly = chkTO.checked);
        fgTO.append(lblTO, chkTO);
        stepBody.append(fgTO);
        // Optional Step Type
        const fgType = document.createElement('div');
        fgType.className = 'field-group';
        const labelType = document.createElement('label');
        labelType.textContent = 'Type (optional)';
        const selectType = document.createElement('select');
        ['', 'session-summary'].forEach(o => {
          const opt = document.createElement('option');
          opt.value = o;
          opt.textContent = o || '(none)';
          selectType.append(opt);
        });
        selectType.value = step.type || '';
        selectType.addEventListener('change', () => {
          step.type = selectType.value;
        });
        fgType.append(labelType, selectType);
        stepBody.append(fgType);

        // REMOVED Block Groups checkbox UI

        // Step Controls
        const stepCtrl = document.createElement('div');
        ['↑', '↓', '×'].forEach(sym => {
          const btn = document.createElement('button');
          btn.textContent = sym;
          btn.className = 'move-btn';
          btn.addEventListener('click', () => {
            const arr = sec.steps;
            if (sym === '×') arr.splice(stidx, 1);
            if (sym === '↑' && stidx > 0) [arr[stidx-1], arr[stidx]] = [arr[stidx], arr[stidx-1]];
            if (sym === '↓' && stidx < arr.length - 1) [arr[stidx+1], arr[stidx]] = [arr[stidx], arr[stidx+1]];
            renderSectionGroups();
          });
          stepCtrl.append(btn);
        });

        // Always show Block Groups UI
        const bgContainer = document.createElement('div');
        bgContainer.className = 'block-groups-list';
        step.stepBlockGroups = step.stepBlockGroups || [];
        renderBlockGroups(bgContainer, step);
        stepHeader.append(stepCtrl);
        stepCard.append(stepHeader, stepBody, bgContainer);

        // Add Block Group button
        const addBgBtn = document.createElement('button');
        addBgBtn.setAttribute('type', 'button');
        addBgBtn.textContent = '+ Add Block Group';
        addBgBtn.addEventListener('click', e => {
          e.preventDefault();
          const newGroup = { id: genUUID(), variant: 'none', blocks: [] };
          const newBlock = { id: genUUID(), type: 'text' };
          newGroup.blocks.push(newBlock);
          step.stepBlockGroups.push(newGroup);
          renderSectionGroups();
        });
        stepCard.append(addBgBtn);

        stepList.append(stepCard);
      });
      const addStepBtn = document.createElement('button');
      addStepBtn.setAttribute('type', 'button');
      addStepBtn.textContent = '+ Add Step';
      addStepBtn.addEventListener('click', e => {
        e.preventDefault();
        sec.steps.push({
          id: genUUID(),
          title: '',
          activityId: '',
          generateId: false,
          teacherOnly: false,
          stepBlockGroups: []
        });
        renderSectionGroups();
      });
      secCard.append(stepList, addStepBtn);

      secList.append(secCard);
    });
    body.append(secList);
    const addSecBtn = document.createElement('button');
    addSecBtn.textContent = '+ Add Section';
    addSecBtn.addEventListener('click', () => {
      grp.sections.push({ id: genUUID(), title: '', steps: [] });
      renderSectionGroups();
    });
    const grpCtrl = document.createElement('div');
    ['↑','↓','×'].forEach(txt => {
      const btn = document.createElement('button');
      btn.textContent = txt;
      btn.className = 'move-btn';
      btn.addEventListener('click', () => {
        if (txt === '×') course.section_groups.splice(gidx,1);
        else if (txt === '↑' && gidx > 0) [course.section_groups[gidx-1],course.section_groups[gidx]] = [course.section_groups[gidx],course.section_groups[gidx-1]];
        else if (txt === '↓' && gidx < course.section_groups.length-1) [course.section_groups[gidx+1],course.section_groups[gidx]] = [course.section_groups[gidx],course.section_groups[gidx+1]];
        renderSectionGroups();
      });
      grpCtrl.append(btn);
    });
    header.append(grpCtrl);
    body.append(addSecBtn);
    list.append(card);
  });
  renderScoring();
  renderActivities();
}

document.getElementById('add-vocab-button').addEventListener('click',()=>{course.vocabulary.push('');refreshVocabList();});
document.getElementById('add-rubric-item').addEventListener('click',()=>{course.rubric.push({id:genUUID(),type:'',title:'',requirements:[]});renderRubric();});
document.getElementById('add-section-group').addEventListener('click',()=>{course.section_groups.push({id:genUUID(),title:'',sections:[]});renderSectionGroups();});

/**
 * Prepares a deep-cloned version of the course for export.
 * - Transforms camelCase keys to snake_case.
 * - Moves media fields under `media` key for media blocks.
 * - Flattens contexts and ensures correct JSON structure for backend.
 */
function prepareExportData(course) {
  // Deep clone.
  const data = JSON.parse(JSON.stringify(course));
  // Nest media blocks.
  data.section_groups.forEach(group => {
    group.sections.forEach(section => {
      section.steps.forEach(step => {
        step.block_groups = step.block_groups || [];
        step.stepBlockGroups?.forEach(bg => {
          bg.blocks.forEach(block => {
            // Consolidate media fields under a single 'media' object for export.
            if (block.type === 'media' && block.url !== undefined && block.mediaType !== undefined) {
              block.media = { url: block.url, type: block.mediaType };
              delete block.url;
              delete block.mediaType;
            }
          });
        });
      });
    });
  });
  // Helper to snake_case keys.
  function snake(obj) {
    if (Array.isArray(obj)) return obj.map(snake);
    if (obj && typeof obj === 'object') {
      const result = {};
      Object.entries(obj).forEach(([k, v]) => {
        let key = k;
        const map = {
          mediaUrl: 'media_url',
          mediaType: 'media_type',
          activityId: 'activity_id',
          teacherOnly: 'teacher_only',
          stepBlockGroups: 'block_groups'
        };
        if (map[k]) key = map[k];
        result[key] = snake(v);
      });
      return result;
    }
    return obj;
  }
  const finalData = snake(data);
  // Remove empty step types.
  finalData.section_groups.forEach(g => {
    g.sections.forEach(sec => {
      sec.steps.forEach(st => {
        if (!st.type) delete st.type;
      });
    });
  });
  // Transform contexts to match expected JSON schema.
  if (
    finalData.scoring &&
    Array.isArray(finalData.scoring.criteria)
  ) {
    finalData.scoring.criteria.forEach(crit => {
      if (crit.contexts) {
        crit.contexts = crit.contexts.map(ctx => {
          const out = {
            type: ctx.memberKey === 'checkpoints' ? 'checkpoint' : 'activity'
          };
          if (ctx.title) out.title = ctx.title;
          if (ctx.memberKey === 'checkpoints') {
            out.checkpoints = ctx.members || [];
          } else {
            // If there are multiple activities, emit 'activities' array.
            if (ctx.members && ctx.members.length > 1) {
              out.activities = ctx.members;
            }
            // Always emit the first as singular 'activity' if present.
            if (ctx.members && ctx.members[0]) {
              out.activity = ctx.members[0];
            }
          }
          return out;
        });
      }
    });
  }
  return finalData;
}




/**
 * Converts all snake_case keys in an object (including deeply nested structures)
 * to camelCase for use in the in-browser editor. Also converts 'block_groups' to 'stepBlockGroups'.
 */
function snakeToCamel(obj) {
  if (Array.isArray(obj)) return obj.map(snakeToCamel);
  if (obj && typeof obj === 'object') {
    const result = {};
    Object.entries(obj).forEach(([key, value]) => {
      // Map snake_case to camelCase.
      let newKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      // Special case: convert 'block_groups' to 'stepBlockGroups' to match internal format.
      if (newKey === 'blockGroups') newKey = 'stepBlockGroups';
      result[newKey] = snakeToCamel(value);
    });
    return result;
  }
  return obj;
}

// Centralized full render routine.
function fullRender() {
  initCourseDetails();
  renderRubric();
  renderSectionGroups();
  renderScoring();
  renderActivities();
  // Rebind header toggles.
  document.querySelectorAll('.card-header').forEach(h =>
    h.addEventListener('click', () => h.nextElementSibling.classList.toggle('hidden'))
  );
  // Ensure all panels are open.
  document.querySelectorAll('.card-body').forEach(el => el.classList.remove('hidden'));
}

document.getElementById('import-json-header').addEventListener('change', event => {
  const file = event.target.files[0];
  // Display filename in the span next to the Import button
  const filenameSpan = document.getElementById('import-filename');
  if (file) {
    filenameSpan.textContent = file.name;
  } else {
    filenameSpan.textContent = '';
  }
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      let data = JSON.parse(e.target.result);
      data = snakeToCamel(data);
      // Flatten checkpoint-set nested media/question/choice objects
      if (data.activities && data.activities['checkpoint-set'] && Array.isArray(data.activities['checkpoint-set'].checkpoints)) {
        data.activities['checkpoint-set'].checkpoints.forEach(cp => {
          // Questions: set type and flatten media
          cp.question = cp.question || [];
          cp.question.forEach(qb => {
            if (!qb.type) {
              if (qb.text) qb.type = 'text';
              else if (qb.media) qb.type = 'media';
              else if (qb.code) qb.type = 'code';
            }
            if (qb.media) {
              qb.mediaType = qb.media.type;
              qb.url = qb.media.url;
              qb.height = qb.media.height;
              delete qb.media;
            }
          });
          // Choices: set type and flatten media
          cp.choices = cp.choices || [];
          cp.choices.forEach(ch => {
            if (!ch.type) {
              if (ch.media) ch.type = 'media';
              else if (ch.text) ch.type = 'text';
              else if (ch.code) ch.type = 'code';
            }
            if (ch.media) {
              ch.mediaType = ch.media.type;
              ch.url = ch.media.url;
              ch.height = ch.media.height;
              delete ch.media;
            }
          });
          // Explanations: set type and flatten media
          cp.explanation = cp.explanation || [];
          cp.explanation.forEach(ex => {
            if (!ex.type) {
              if (ex.text) ex.type = 'text';
              else if (ex.media) ex.type = 'media';
            }
            if (ex.media) {
              ex.mediaType = ex.media.type;
              ex.url = ex.media.url;
              ex.height = ex.media.height;
              delete ex.media;
            }
          });
        });
      }
      // --- FLATTEN checkpoint fields inside blocks for proper UI rendering ---
      (data.sectionGroups || data.section_groups || []).forEach(group => {
        (group.sections || []).forEach(section => {
          (section.steps || []).forEach(step => {
            (step.stepBlockGroups || step.block_groups || []).forEach(bg => {
              (bg.blocks || []).forEach(block => {
                if (block.type === 'checkpoint') {
                  // Ensure defaults for question and feedback text
                  block.question = block.question || '';
                  block.correct_text = block.correct_text || '';
                  block.incorrect_text = block.incorrect_text || '';
                  // Ensure choices array and each choice has text
                  block.choices = (block.choices || []).map(choice => ({
                    id: choice.id || genUUID(),
                    text: choice.text || '',
                    correct: !!choice.correct,
                    type: choice.type || 'text'
                  }));
                }
              });
            });
          });
        });
      });
      // Rebuild contexts in camel format
      if (data.scoring && Array.isArray(data.scoring.criteria)) {
        data.scoring.criteria = data.scoring.criteria.map(crit => {
          crit.contexts = (crit.contexts || []).map(ctx => {
            const memberKey = ctx.type === 'checkpoint' ? 'checkpoints' : 'activities';
            const members = ctx.checkpoints || (ctx.activity ? [ctx.activity] : []);
            return { memberKey, members, title: ctx.title || '' };
          });
          return crit;
        });
      }
      // Merge imported data into the existing course object
      Object.assign(course, {
        id: data.id || genUUID(),
        name: data.name || '',
        title: data.title || '',
        description: data.description || '',
        mediaUrl: data.mediaUrl || '',
        mediaType: data.mediaType || 'image',
        language: data.language || 'CoBlocks',
        vocabulary: Array.isArray(data.vocabulary) ? data.vocabulary : [],
        rubric: Array.isArray(data.rubric) ? data.rubric : [],
        section_groups: Array.isArray(data.sectionGroups) ? data.sectionGroups : Array.isArray(data.section_groups) ? data.section_groups : [],
        scoring: data.scoring || { criteria: [] },
        activities: data.activities || {}
      });
      // Re-render immediately
      fullRender();
    } catch (err) {
      console.error('Invalid JSON file', err);
    }
  };
  reader.readAsText(file);
});

// Export the entire curriculum as a JSON file.
document.getElementById('export-json-header').addEventListener('click', () => {
  const data = JSON.stringify(prepareExportData(course), null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const rawTitle = document.getElementById('course-title').value || course.title || 'curriculum';
  const filename = rawTitle.trim().replace(/\s+/g, '_') + '.json';
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
});

// Keep activities in sync with section groups.
function syncActivities() {
  const ids = new Set();
  course.section_groups.forEach(g => g.sections.forEach(sec => sec.steps.forEach(st => {
    if (st.activityId) ids.add(st.activityId);
  })));
  ids.forEach(id => { if (!course.activities[id]) course.activities[id] = {}; });
  Object.keys(course.activities).forEach(id => {
    if (!ids.has(id)) delete course.activities[id];
  });
}

    /**
     * Renders scoring criteria for the course, including components and context mappings.
     * Supports multiple component types (e.g., checkpoint, activity) and variants like rubric scoring.
     */
    // Render Scoring panel
    function renderScoring() {
      const list = document.getElementById('criteria-list');
      if (!list) return;
      list.innerHTML = '';
      course.scoring.criteria.forEach((crit, idx) => {
        const { card, header, body } = createCard(`Criterion ${idx+1}`);

        // Title
        const fgT = document.createElement('div'); fgT.className='field-group';
        const lblT = document.createElement('label'); lblT.textContent='Title';
        const inpT = document.createElement('input'); inpT.type='text'; inpT.value=crit.title||'';
        inpT.addEventListener('input', () => crit.title = inpT.value);
        fgT.append(lblT,inpT); body.append(fgT);

        // Components editor
        crit.components = crit.components || [];
        // Wrap components list and button into the field-group grid
        const compList = document.createElement('ul');
        compList.className = 'component-list';
        crit.components.forEach((comp, cidx) => {
          const li = document.createElement('li');

          // Labeled Component ID
          const selId = document.createElement('select');
          getCheckpointOptions().forEach(({id,label}) => {
            const opt = document.createElement('option');
            opt.value = id;
            opt.textContent = label;
            selId.append(opt);
          });
          selId.value = comp.id || '';
          selId.addEventListener('change', () => { comp.id = selId.value; });
          const fgCompId = document.createElement('div');
          fgCompId.className = 'field-group';
          const lblCompId = document.createElement('label');
          lblCompId.textContent = 'Component ID';
          fgCompId.append(lblCompId, selId);
          li.append(fgCompId);

          // Labeled Type
          const selType = document.createElement('select');
          ['checkpoint','activity'].forEach(t => {
            const opt = document.createElement('option');
            opt.value = t;
            opt.textContent = t.charAt(0).toUpperCase() + t.slice(1);
            selType.append(opt);
          });
          selType.value = comp.type || 'checkpoint';
          selType.addEventListener('change', () => { comp.type = selType.value; });
          const fgCompType = document.createElement('div');
          fgCompType.className = 'field-group';
          const lblCompType = document.createElement('label');
          lblCompType.textContent = 'Type';
          fgCompType.append(lblCompType, selType);
          li.append(fgCompType);

          // Labeled Weight
          const weightInput = document.createElement('input');
          weightInput.type = 'number';
          weightInput.min = '0';
          weightInput.step = 'any';
          weightInput.value = comp.weight != null ? comp.weight : 1;
          // Wider weight input for clarity
          weightInput.style.width = '6ch';
          weightInput.addEventListener('input', () => {
            comp.weight = parseFloat(weightInput.value) || 0;
          });
          const fgCompWeight = document.createElement('div');
          fgCompWeight.className = 'field-group';
          const lblCompWeight = document.createElement('label');
          lblCompWeight.textContent = 'Weight';
          fgCompWeight.append(lblCompWeight, weightInput);
          li.append(fgCompWeight);

          // Variant and Categories for checkpoint components
          if (comp.type === 'checkpoint') {
            // Ensure categories array exists
            comp.categories = comp.categories || [];

            // Variant selector
            const variantSelect = document.createElement('select');
            ['none','multiple_choice','short_answer','rubric','link','rich_text'].forEach(v => {
              const opt = document.createElement('option');
              opt.value = v;
              opt.textContent = v.replace('_', ' ');
              variantSelect.append(opt);
            });
            variantSelect.value = comp.variant || 'none';
            variantSelect.addEventListener('change', () => {
              comp.variant = variantSelect.value;
              renderScoring();
            });
            const fgVariant = document.createElement('div');
            fgVariant.className = 'field-group';
            const lblVariant = document.createElement('label');
            lblVariant.textContent = 'Variant';
            fgVariant.append(lblVariant, variantSelect);
            li.append(fgVariant);

            // Categories tag list (only when variant is rubric)
            if (comp.variant === 'rubric') {
              const fgCats = document.createElement('div');
              fgCats.className = 'field-group';
              const lblCats = document.createElement('label');
              lblCats.textContent = 'Categories';
              const catsContainer = document.createElement('div');
              catsContainer.className = 'tag-list';
              comp.categories.forEach((cat, catIdx) => {
                const tagDiv = document.createElement('div');
                tagDiv.className = 'tag-item';
                const inputCat = document.createElement('input');
                inputCat.type = 'text';
                inputCat.value = cat;
                inputCat.addEventListener('input', () => { comp.categories[catIdx] = inputCat.value; });
                const delCat = document.createElement('button');
                delCat.type = 'button';
                delCat.textContent = '×';
                delCat.addEventListener('click', () => {
                  comp.categories.splice(catIdx, 1);
                  renderScoring();
                });
                tagDiv.append(inputCat, delCat);
                catsContainer.append(tagDiv);
              });
              const addCatBtn = document.createElement('button');
              addCatBtn.type = 'button';
              addCatBtn.textContent = '+ Add Category';
              addCatBtn.style.minWidth = '140px';
              addCatBtn.addEventListener('click', () => {
                comp.categories.push('');
                renderScoring();
              });
              fgCats.append(lblCats, catsContainer, addCatBtn);
              li.append(fgCats);
            }
          }

          // Move / Delete controls (now below all fields)
          createMoveDeleteControls(li, crit.components, cidx, renderScoring);

          compList.append(li);
        });

        const addCompBtn = document.createElement('button');
        addCompBtn.type = 'button';
        addCompBtn.textContent = '+ Add Component';
        addCompBtn.addEventListener('click', () => {
          crit.components.push({ id: '', type: 'checkpoint', weight: 1 });
          renderScoring();
        });
        // Wrap components list and button into the field-group grid
        const fgCompWrap = document.createElement('div');
        fgCompWrap.className = 'field-group';
        const lblCompWrap = document.createElement('label');
        lblCompWrap.textContent = 'Components';
        fgCompWrap.append(lblCompWrap, compList, addCompBtn);
        body.append(fgCompWrap);

        // Contexts (use grid-aligned field-group)
        crit.contexts = crit.contexts || [];
        const ctxList = document.createElement('ul');
        ctxList.className = 'requirements-list';
        crit.contexts.forEach((ctx, kidx) => {
          const li = document.createElement('li');
          // memberKey dropdown with labeled field-group
          const selMember = document.createElement('select');
          ['activities', 'checkpoints'].forEach(optKey => {
            const opt = document.createElement('option');
            opt.value = optKey;
            opt.textContent = optKey;
            selMember.append(opt);
          });
          selMember.value = ctx.memberKey || 'activities';
          selMember.addEventListener('change', () => {
            ctx.memberKey = selMember.value;
            // When changing type, reset members array
            ctx.members = [];
            renderScoring();
          });
          const fgCtxType = document.createElement('div');
          fgCtxType.className = 'field-group';
          const lblCtxType = document.createElement('label');
          lblCtxType.textContent = 'Type';
          fgCtxType.append(lblCtxType, selMember);
          li.append(fgCtxType);

          // Context Title
          const fgCtxTitle = document.createElement('div');
          fgCtxTitle.className = 'field-group';
          const lblCtxTitle = document.createElement('label');
          lblCtxTitle.textContent = 'Title';
          const inputCtxTitle = document.createElement('input');
          inputCtxTitle.type = 'text';
          inputCtxTitle.value = ctx.title || '';
          inputCtxTitle.addEventListener('input', () => {
            ctx.title = inputCtxTitle.value;
          });
          fgCtxTitle.append(lblCtxTitle, inputCtxTitle);
          li.append(fgCtxTitle);

          // Members editor (multiple entries)
          ctx.members = ctx.members || [];
          const memContainer = document.createElement('div');
          memContainer.className = 'member-list';

          ctx.members.forEach((mid, midx) => {
            const memDiv = document.createElement('div');
            memDiv.className = 'field-group';
            const sel = document.createElement('select');
            // Populate options based on context type
            if (ctx.memberKey === 'activities') {
              getActivityOptions().forEach(({id,label}) => {
                const opt = document.createElement('option');
                opt.value = id;
                opt.textContent = label;
                sel.append(opt);
              });
            } else {
              getCheckpointOptions().forEach(({id,label}) => {
                const opt = document.createElement('option');
                opt.value = id;
                opt.textContent = label;
                sel.append(opt);
              });
            }
            sel.value = mid || '';
            sel.addEventListener('change', () => { ctx.members[midx] = sel.value; });
            const delBtn = document.createElement('button');
            delBtn.type = 'button';
            delBtn.textContent = '×';
            delBtn.addEventListener('click', () => {
              ctx.members.splice(midx, 1);
              renderScoring();
            });
            memDiv.append(sel, delBtn);
            memContainer.append(memDiv);
          });

          // Add Member button
          const addMemBtn = document.createElement('button');
          addMemBtn.type = 'button';
          addMemBtn.textContent = ctx.memberKey === 'activities' ? '+ Add Activity' : '+ Add Checkpoint';
          addMemBtn.addEventListener('click', () => {
            ctx.members.push('');
            renderScoring();
          });
          memContainer.append(addMemBtn);
          li.append(memContainer);

          // Remove context button
          const delBtn = document.createElement('button');
          delBtn.type = 'button';
          delBtn.textContent = '×';
          delBtn.addEventListener('click', () => {
            crit.contexts.splice(kidx, 1);
            renderScoring();
          });
          li.append(delBtn);
          ctxList.append(li);
        });
        const addCtxBtn = document.createElement('button');
        addCtxBtn.type = 'button';
        addCtxBtn.textContent = '+ Add Context';
        addCtxBtn.addEventListener('click', () => {
          crit.contexts.push({ memberKey: 'activities', members: [''] });
          renderScoring();
        });
        const fgCtxWrap = document.createElement('div');
        fgCtxWrap.className = 'field-group';
        const lblCtxWrap = document.createElement('label');
        lblCtxWrap.textContent = 'Contexts';
        fgCtxWrap.append(lblCtxWrap, ctxList, addCtxBtn);
        body.append(fgCtxWrap);

        // Contexts and other fields will be here (already implemented)
        list.append(card);
      });
    }

    /**
     * Renders the Activities Mapping panel for associating activities to tools and URLs.
     * Includes a JSON editor for raw overrides and a full UI for checkpoint sets.
     */
    // Render Activities Mapping panel
    function renderActivities() {
      syncActivities();
      const list = document.getElementById('activities-list');
      if (!list) return;
      list.innerHTML = '';
      Object.entries(course.activities).forEach(([id, obj]) => {
        const { card, header, body } = createCard(`Activity ${id}`);
        let ta;

        // Tool selector
        const fgTool = document.createElement('div'); fgTool.className = 'field-group';
        const lblTool = document.createElement('label'); lblTool.textContent = 'Tool';
        const selTool = document.createElement('select');
        ['checkpoint-set','cospaces','quiz','exit-ticket','lesson-plan','example-project','other'].forEach(t => {
          const opt = document.createElement('option');
          opt.value = t;
          opt.textContent = t.charAt(0).toUpperCase() + t.slice(1).replace('-', ' ');
          selTool.append(opt);
        });
        selTool.value = obj.tool || '';
        selTool.addEventListener('change', () => {
          obj.tool = selTool.value;
          renderActivities();
        });
        fgTool.append(lblTool, selTool); body.append(fgTool);

        // URL field
        const fgURL = document.createElement('div'); fgURL.className = 'field-group';
        const lblURL = document.createElement('label'); lblURL.textContent = 'URL';
        const inpURL = document.createElement('input'); inpURL.type = 'text';
        inpURL.value = obj.url !== undefined ? obj.url : ((obj.media && obj.media.url) || '');
        inpURL.addEventListener('input', () => { obj.url = inpURL.value; if (ta) ta.value = JSON.stringify(obj, null, 2); });
        fgURL.append(lblURL, inpURL); body.append(fgURL);

        // Media Type field
        const fgMedia = document.createElement('div'); fgMedia.className = 'field-group';
        const lblMedia = document.createElement('label'); lblMedia.textContent = 'Media Type';
        const inpMedia = document.createElement('input'); inpMedia.type = 'text';
        inpMedia.value = obj.media && obj.media.type || '';
        inpMedia.addEventListener('input', () => {
          obj.media = obj.media || {};
          obj.media.type = inpMedia.value;
          if (ta) ta.value = JSON.stringify(obj, null, 2);
        });
        fgMedia.append(lblMedia, inpMedia); body.append(fgMedia);

        // Action field
        const fgAction = document.createElement('div'); fgAction.className = 'field-group';
        const lblAction = document.createElement('label'); lblAction.textContent = 'Action';
        const inpAction = document.createElement('input'); inpAction.type = 'text'; inpAction.value = obj.action || '';
        inpAction.addEventListener('input', () => { obj.action = inpAction.value; if (ta) ta.value = JSON.stringify(obj, null, 2); });
        fgAction.append(lblAction, inpAction); body.append(fgAction);

        // Rich editor for checkpoint-set mappings
        if (obj.tool === 'checkpoint-set') {
          const fgSet = document.createElement('div');
          fgSet.className = 'field-group';

          // Container to hold checkpoint cards in column 2
          const cpContainer = document.createElement('div');
          cpContainer.className = 'checkpoint-cards-wrapper';

          const lblSet = document.createElement('label');
          lblSet.textContent = 'Checkpoint Set';
          fgSet.append(lblSet, cpContainer);

          obj.checkpoints = obj.checkpoints || [];
          obj.checkpoints.forEach((cp, cpidx) => {
            const cpCard = document.createElement('div');
            cpCard.className = 'card';
            const cpHeader = document.createElement('div');
            cpHeader.className = 'card-header';
            cpHeader.textContent = `Checkpoint ${cpidx+1}`;
            const cpBody = document.createElement('div');
            cpBody.className = 'card-body';
            cpCard.append(cpHeader, cpBody);

            // Comment
            addField(cpBody, 'Comment', cp, 'comment');

            // Title
            addField(cpBody, 'Title', cp, 'title');

            // Variant
            addSelect(cpBody, 'Variant', cp, 'variant', ['none','multiple_choice','short_answer','rubric','link','rich_text']);

            // Question blocks
            cp.question = cp.question || [];
            const qCont = document.createElement('div');
            qCont.className = 'question-container';
            cp.question.forEach((qb, qidx) => {
              const qbCard = document.createElement('div');
              qbCard.className = 'card';
              const qbHdr = document.createElement('div');
              qbHdr.className = 'card-header';
              qbHdr.textContent = `Question Part ${qidx+1}`;
              const qbBody = document.createElement('div');
              qbBody.className = 'card-body';
              qbCard.append(qbHdr, qbBody);

              // Type
              addSelect(qbBody, 'Type', qb, 'type', ['text','code','media']);
              // Inner fields
              function renderQFields() {
                qbBody.querySelectorAll('.field-group:not(:first-child)').forEach(n=>n.remove());
                switch (qb.type) {
                  case 'text':
                    addTextarea(qbBody, 'Text', qb, 'text');
                    break;
                  case 'code':
                    addTextarea(qbBody, 'Code', qb, 'code');
                    addSelect(qbBody, 'Language', qb, 'language', ['python','java','html','css','js']);
                    break;
                  case 'media':
                    addSelect(qbBody, 'Media Type', qb, 'mediaType', ['image','video']);
                    addField(qbBody, 'URL', qb, 'url');
                    const fgQH = document.createElement('div'); fgQH.className='field-group';
                    const lblQH = document.createElement('label'); lblQH.textContent='Height (px)';
                    const inpQH = document.createElement('input'); inpQH.type='number';
                    inpQH.value = qb.height ? parseInt(qb.height) : '';
                    inpQH.addEventListener('input',()=>qb.height = inpQH.value? inpQH.value+'px': '');
                    fgQH.append(lblQH, inpQH); qbBody.append(fgQH);
                    break;
                }
              }
              qb.query = qb.question; // no-op
              qbCard.querySelector('select').addEventListener('change', renderQFields);
              renderQFields();

              // Remove part
              const remQB = document.createElement('button');
              remQB.type='button'; remQB.textContent='Remove Part';
              remQB.addEventListener('click', ()=>{ cp.question.splice(qidx,1); renderActivities(); });
              qbBody.append(remQB);

              qCont.append(qbCard);
            });
            const addQB = document.createElement('button');
            addQB.type='button'; addQB.textContent = '+ Add Question Part';
            addQB.addEventListener('click', ()=>{ cp.question.push({ id: genUUID(), type:'text', text:'' }); renderActivities(); });
            qCont.append(addQB);
            cpBody.append(qCont);

            // Choices
            cp.choices = cp.choices || [];
            const chCont = document.createElement('div');
            chCont.className = 'choices-container';
            cp.choices.forEach((ch, cidx) => {
              const chCard = document.createElement('div');
              chCard.className = 'card';
              const chHdr = document.createElement('div');
              chHdr.className = 'card-header';
              chHdr.textContent = `Choice ${cidx+1}`;
              const chBody = document.createElement('div');
              chBody.className = 'card-body';
              chCard.append(chHdr, chBody);

              addSelect(chBody, 'Type', ch, 'type', ['text','code','media']);
              function renderChFields() {
                chBody.querySelectorAll('.field-group:not(:first-child)').forEach(n=>n.remove());
                switch (ch.type) {
                  case 'text':
                    addTextarea(chBody, 'Text', ch, 'text');
                    break;
                  case 'code':
                    addTextarea(chBody, 'Code', ch, 'code');
                    addSelect(chBody, 'Language', ch, 'language', ['python','java','html','css','js']);
                    break;
                  case 'media':
                    addSelect(chBody, 'Media Type', ch, 'mediaType', ['image','video']);
                    addField(chBody, 'URL', ch, 'url');
                    const fgCH = document.createElement('div'); fgCH.className='field-group';
                    const lblCH = document.createElement('label'); lblCH.textContent='Height (px)';
                    const inpCH = document.createElement('input'); inpCH.type='number';
                    inpCH.value = ch.height ? parseInt(ch.height) : '';
                    inpCH.addEventListener('input',()=>ch.height = inpCH.value? inpCH.value+'px':'');
                    fgCH.append(lblCH, inpCH); chBody.append(fgCH);
                    break;
                }
                addCheckbox(chBody, 'Correct', ch, 'correct');
              }
              chCard.querySelector('select').addEventListener('change', renderChFields);
              renderChFields();

              const remCh = document.createElement('button');
              remCh.type='button'; remCh.textContent='Remove Choice';
              remCh.addEventListener('click', ()=>{ cp.choices.splice(cidx,1); renderActivities(); });
              chBody.append(remCh);

              chCont.append(chCard);
            });
            const addCh = document.createElement('button');
            addCh.type='button'; addCh.textContent='+ Add Choice';
            addCh.addEventListener('click', ()=>{ cp.choices.push({ id: genUUID(), type:'text', text:'', correct:false }); renderActivities(); });
            chCont.append(addCh);
            cpBody.append(chCont);

            // Explanation
            cp.explanation = cp.explanation || [];
            const exCont = document.createElement('div');
            exCont.className = 'explanation-container';
            cp.explanation.forEach((ex, eidx) => {
              const exCard = document.createElement('div');
              exCard.className = 'card';
              const exHdr = document.createElement('div');
              exHdr.className = 'card-header';
              exHdr.textContent = `Explanation ${eidx+1}`;
              const exBody = document.createElement('div');
              exBody.className = 'card-body';
              exCard.append(exHdr, exBody);

              addSelect(exBody, 'Type', ex, 'type', ['text','media']);
              function renderExFields() {
                exBody.querySelectorAll('.field-group:not(:first-child)').forEach(n=>n.remove());
                if (ex.type === 'text') addTextarea(exBody, 'Text', ex, 'text');
                else {
                  addSelect(exBody, 'Media Type', ex, 'mediaType', ['image','video']);
                  addField(exBody, 'URL', ex, 'url');
                }
              }
              exCard.querySelector('select').addEventListener('change', renderExFields);
              renderExFields();

              const remEx = document.createElement('button');
              remEx.type='button'; remEx.textContent='Remove Explanation';
              remEx.addEventListener('click', ()=>{ cp.explanation.splice(eidx,1); renderActivities(); });
              exBody.append(remEx);

              exCont.append(exCard);
            });
            const addEx = document.createElement('button');
            addEx.type='button'; addEx.textContent='+ Add Explanation';
            addEx.addEventListener('click', ()=>{ cp.explanation.push({ id: genUUID(), type:'text', text:'' }); renderActivities(); });
            exCont.append(addEx);
            cpBody.append(exCont);

            // Remove checkpoint
            const remCp = document.createElement('button');
            remCp.type='button'; remCp.textContent='Remove Checkpoint';
            remCp.addEventListener('click', ()=>{ obj.checkpoints.splice(cpidx,1); renderActivities(); });
            cpBody.append(remCp);

            cpContainer.append(cpCard);
          });

          const addCp = document.createElement('button');
          addCp.type='button'; addCp.textContent = '+ Add Checkpoint';
          addCp.addEventListener('click', ()=>{
            obj.checkpoints.push({
              id: genUUID(), type: 'checkpoint', comment: '', title: '',
              variant: 'none', question: [], choices: [], explanation: []
            });
            renderActivities();
          });
          cpContainer.append(addCp);

          body.append(fgSet);
        }

        // Raw JSON editor
        const fgRaw = document.createElement('div'); fgRaw.className = 'field-group';
        const lblRaw = document.createElement('label'); lblRaw.textContent = 'Mapping (JSON)';
        ta = document.createElement('textarea');
        ta.style.width = '100%'; ta.style.height = '8em';
        ta.value = JSON.stringify(obj, null, 2);
        ta.addEventListener('input', () => { try { course.activities[id] = JSON.parse(ta.value); } catch {} });
        fgRaw.append(lblRaw, ta); body.append(fgRaw);

        list.append(card);
      });
    }

    function genUUID(){return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;const v=c==='x'?r:(r&0x3|0x8);return v.toString(16);});}

document.addEventListener('DOMContentLoaded', ()=>{
  if(!course.id) course.id=genUUID();
  initCourseDetails();
  renderRubric();
  renderSectionGroups();
  renderScoring();
  renderActivities();
  document.getElementById('add-criterion').addEventListener('click', () => {
    course.scoring.criteria.push({ title:'', components:[], contexts:[] });
    renderScoring();
    renderActivities();
  });
});

// Global expand/collapse handler for all card headers
document.body.addEventListener('click', e => {
  if (e.target.classList.contains('card-header')) {
    const card = e.target.parentElement;
    const panel = e.target.nextElementSibling;
    if (panel && panel.classList.contains('card-body')) {
      panel.classList.toggle('hidden');
      // toggle open and active styles
      card.classList.toggle('open');
      card.classList.toggle('active-card');
    }
  }
});

// Helpers for blocks UI.
// Generic helper: adds a labeled single-line input field to the container.
function addField(container, labelText, obj, prop) {
  const fg = document.createElement('div');
  fg.className = 'field-group';
  const lbl = document.createElement('label');
  lbl.textContent = labelText;
  const inp = document.createElement('input');
  inp.type = 'text';
  inp.value = obj[prop] || '';
  inp.addEventListener('input', () => obj[prop] = inp.value);
  fg.append(lbl, inp);
  container.append(fg);
}

// Generic helper: adds a labeled textarea to the container.
function addTextarea(container, labelText, obj, prop) {
  const fg = document.createElement('div');
  fg.className = 'field-group';
  const lbl = document.createElement('label');
  lbl.textContent = labelText;
  const ta = document.createElement('textarea');
  ta.value = obj[prop] || '';
  ta.addEventListener('input', () => obj[prop] = ta.value);
  fg.append(lbl, ta);
  container.append(fg);
}

// Generic helper: adds a checkbox with label to the container.
function addCheckbox(container, labelText, obj, prop) {
  const fg = document.createElement('div');
  fg.className = 'field-group';
  const lbl = document.createElement('label');
  lbl.textContent = labelText;
  const chk = document.createElement('input');
  chk.type = 'checkbox';
  chk.checked = obj[prop] || false;
  chk.addEventListener('change', () => obj[prop] = chk.checked);
  fg.append(lbl, chk);
  container.append(fg);
}

// Generic helper: adds a labeled dropdown/select menu to the container.
function addSelect(container, labelText, obj, prop, options) {
  const fg = document.createElement('div');
  fg.className = 'field-group';
  const lbl = document.createElement('label');
  lbl.textContent = labelText;
  const sel = document.createElement('select');
  options.forEach(o => {
    const opt = document.createElement('option');
    opt.value = o;
    opt.textContent = o;
    sel.append(opt);
  });
  sel.value = obj[prop] || options[0];
  sel.addEventListener('change', () => obj[prop] = sel.value);
  fg.append(lbl, sel);
  container.append(fg);
}

// Helper to create move/delete controls for array items.
function createMoveDeleteControls(container, arr, idx, renderFn) {
  const ctrl = document.createElement('div');
  ['↑', '↓', '×'].forEach(sym => {
    const btn = document.createElement('button');
    btn.textContent = sym;
    btn.className = 'move-btn';
    btn.addEventListener('click', () => {
      if (sym === '×') arr.splice(idx, 1);
      if (sym === '↑' && idx > 0) [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      if (sym === '↓' && idx < arr.length - 1) [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
      renderFn();
    });
    ctrl.append(btn);
  });
  container.append(ctrl);
}

function renderBlockGroups(container, step) {
  container.innerHTML = '';
  step.stepBlockGroups = step.stepBlockGroups || [];
  step.stepBlockGroups.forEach((bg, bidx) => {
    const bgCard = document.createElement('div');
    bgCard.className = 'block-group-item card';
    const header = document.createElement('div');
    header.className = 'card-header';
    header.textContent = `Block Group ${bidx + 1}`;
    // Only append the header (no body)
    bgCard.appendChild(header);

    // Create the block-list and render blocks into it
    const blkList = document.createElement('div');
    blkList.className = 'block-list';
    renderBlockList(blkList, bg, step, container);
    bgCard.appendChild(blkList);

    container.append(bgCard);
  });
}

// Helper: renders the list of blocks for a block group into blkList
function renderBlockList(blkList, bg, step, container) {
  blkList.innerHTML = '';
  bg.blocks = bg.blocks || [];
  bg.blocks.forEach((blk, bix) => {
    const blkCard = document.createElement('div');
    blkCard.className = 'block-item card';
    const blkHeader = document.createElement('div');
    blkHeader.className = 'card-header';
    blkHeader.textContent = `Block ${bg.index !== undefined ? bg.index + 1 : ''}${bix + 1}`;
    // Insert block move/delete controls in header
    const blkCtrl = document.createElement('div');
    ['↑', '↓', '×'].forEach(sym => {
      const btn = document.createElement('button');
      btn.textContent = sym;
      btn.className = 'move-btn';
      btn.type = 'button';
      btn.addEventListener('click', () => {
        if (sym === '×') bg.blocks.splice(bix, 1);
        if (sym === '↑' && bix > 0) [bg.blocks[bix - 1], bg.blocks[bix]] = [bg.blocks[bix], bg.blocks[bix - 1]];
        if (sym === '↓' && bix < bg.blocks.length - 1) [bg.blocks[bix + 1], bg.blocks[bix]] = [bg.blocks[bix], bg.blocks[bix + 1]];
        renderSectionGroups();
      });
      blkCtrl.appendChild(btn);
    });
    blkHeader.appendChild(blkCtrl);
    const blkBody = document.createElement('div');
    blkBody.className = 'card-body';
    blkCard.append(blkHeader, blkBody);

    // Block Type Selector
    addSelect(blkBody, 'Type', blk, 'type', [
      'text', 'label', 'exemplar',
      'code', 'media', 'checkpoint', 'artifacts', 'rubric', 'framed-text', 'framed-table', 'vocabulary'
    ]);
    // Make the Type dropdown narrower
    const lastSel = blkBody.querySelectorAll('select');
    const typeSel = lastSel[lastSel.length - 1];
    typeSel.style.flex = '0 0 12ch';

    // Container for type-specific fields
    const typeFields = document.createElement('div');
    typeFields.className = 'field-group type-fields';
    blkBody.append(typeFields);

    // Render function for fields based on blk.type
    function renderBlockTypeFields() {
      // Default hidden checkpoint labels
      if (blk.type === 'checkpoint') {
        blk.correct_text = blk.correct_text || 'Correct';
        blk.incorrect_text = blk.incorrect_text || 'Incorrect';
        blk.categories = blk.categories || [];
      }
      typeFields.innerHTML = '';

      // Optional Audio for block
      const fgAudio = document.createElement('div');
      fgAudio.className = 'field-group';
      const lblAudio = document.createElement('label');
      lblAudio.textContent = 'Include Audio';
      const chkAudio = document.createElement('input');
      chkAudio.type = 'checkbox';
      chkAudio.checked = blk.audioEnabled || false;
      chkAudio.style.flex = '0 0 auto';
      chkAudio.style.marginLeft = '8px';
      chkAudio.addEventListener('change', () => {
        blk.audioEnabled = chkAudio.checked;
        renderBlockTypeFields();
      });
      fgAudio.append(lblAudio, chkAudio);
      typeFields.append(fgAudio);

      if (blk.audioEnabled) {
        const urlFg = document.createElement('div');
        urlFg.className = 'field-group';
        const urlLbl = document.createElement('label');
        urlLbl.textContent = 'Audio URL';
        const urlInput = document.createElement('input');
        urlInput.type = 'text';
        urlInput.value = blk.audio || '';
        // full-width styling
        urlInput.style.display = 'block';
        urlInput.style.width = '100%';
        urlInput.style.boxSizing = 'border-box';
        urlInput.addEventListener('input', () => blk.audio = urlInput.value);
        urlFg.append(urlLbl, urlInput);
        typeFields.append(urlFg);
      }

      // Insert type-specific UI for checkpoint before questionBlocks rendering
      if (blk.type === 'checkpoint') {
        // --- Legacy question migration ---
        if (blk.question && (!blk.questionBlocks || blk.questionBlocks.length === 0)) {
          blk.questionBlocks = [{ type: 'text', text: blk.question }];
          delete blk.question;
        }
        // Correct / Incorrect Text
        addField(typeFields, 'Correct Text', blk, 'correct_text');
        addField(typeFields, 'Incorrect Text', blk, 'incorrect_text');
      }

      // --- keep the rest of the block type rendering code as before ---
      // (copy all the case logic from the original function here)
      // ... (for brevity, not repeating the entire switch/case here, but it should be the same as above)
      // --- BEGIN COPY OF SWITCH LOGIC ---
      switch (blk.type) {
        case 'artifacts':
          addField(typeFields, 'Title', blk, 'title');
          const artRowContainer = document.createElement('div');
          artRowContainer.className = 'artifact-rows';
          blk.rows = blk.rows || [];
          blk.rows.forEach((row, ridx) => {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'artifact-row card';
            const rowHeader = document.createElement('div');
            rowHeader.className = 'card-header';
            rowHeader.textContent = `Row ${ridx + 1}`;
            rowDiv.append(rowHeader);
            addField(rowDiv, 'Category', row, 'category');
            const artList = document.createElement('div');
            artList.className = 'artifacts-list';
            row.artifacts = row.artifacts || [];
            row.artifacts.forEach((art, aidx) => {
              art.title = art.title || { text: '', url: '' };
              art.icon = art.icon || { type: 'pdf', url: '' };
              const artDiv = document.createElement('div');
              artDiv.className = 'artifact-item card';
              const artHeader = document.createElement('div');
              artHeader.className = 'card-header';
              artHeader.textContent = `Artifact ${aidx + 1}`;
              artDiv.append(artHeader);
              addField(artDiv, 'Title Text', art.title, 'text');
              addField(artDiv, 'Title URL (optional)', art.title, 'url');
              addField(artDiv, 'Subtitle (optional)', art, 'subtitle');
              addSelect(artDiv, 'Icon Type (optional)', art.icon, 'type', ['pdf']);
              addField(artDiv, 'Icon URL (optional)', art.icon, 'url');
              createMoveDeleteControls(artDiv, row.artifacts, aidx, renderSectionGroups);
              artList.append(artDiv);
            });
            const addArtBtn = document.createElement('button');
            addArtBtn.type = 'button';
            addArtBtn.textContent = '+ Add Artifact';
            addArtBtn.addEventListener('click', e => {
              e.preventDefault();
              row.artifacts.push({
                title: { text: '', url: '' },
                subtitle: '',
                icon: { type: 'pdf', url: '' }
              });
              renderSectionGroups();
            });
            rowDiv.append(artList, addArtBtn);
            createMoveDeleteControls(rowDiv, blk.rows, ridx, renderSectionGroups);
            artRowContainer.append(rowDiv);
          });
          const addRowBtn2 = document.createElement('button');
          addRowBtn2.type = 'button';
          addRowBtn2.textContent = '+ Add Row';
          addRowBtn2.addEventListener('click', e => {
            e.preventDefault();
            blk.rows.push({ category: '', artifacts: [] });
            renderSectionGroups();
          });
          typeFields.append(artRowContainer, addRowBtn2);
          break;
        case 'text':
          const fgVariant = document.createElement('div');
          fgVariant.className = 'field-group';
          const lblVar = document.createElement('label');
          lblVar.textContent = 'Variant';
          const variantSel = document.createElement('select');
          ['none', 'numbered', 'lettered'].forEach(v => {
            const opt = document.createElement('option');
            opt.value = v;
            opt.textContent = v;
            variantSel.append(opt);
          });
          variantSel.value = blk.variant || 'none';
          variantSel.style.flex = '0 0 12ch';
          variantSel.addEventListener('change', () => { blk.variant = variantSel.value; });
          fgVariant.append(lblVar, variantSel);
          typeFields.append(fgVariant);
          const fgText = document.createElement('div');
          fgText.className = 'field-group';
          const lblText = document.createElement('label');
          lblText.textContent = 'Text';
          const txtArea = document.createElement('textarea');
          txtArea.value = blk.text || '';
          txtArea.style.flex = '1 1 100%';
          txtArea.style.width = '100%';
          txtArea.addEventListener('input', () => blk.text = txtArea.value);
          fgText.append(lblText, txtArea);
          typeFields.append(fgText);
          break;
        case 'label':
          addTextarea(typeFields, 'Text', blk, 'text');
          addSelect(typeFields, 'Variant', blk, 'variant', ['none', 'exemplar', 'college-board']);
          break;
        case 'exemplar':
          addTextarea(typeFields, 'Text', blk, 'text');
          delete blk.variant;
          break;
        case 'code':
          addTextarea(typeFields, 'Code', blk, 'code');
          addSelect(typeFields, 'Variant', blk, 'variant', ['none', 'python', 'java', 'html', 'css', 'console', 'college-board']);
          break;
        case 'media':
          blk.media = blk.media || {};
          addSelect(typeFields, 'Media Type', blk.media, 'type', ['image', 'video']);
          addField(typeFields, 'URL', blk.media, 'url');
          // Maintain backward compatibility with flat URL and mediaType
          if (!blk.media.url && blk.url) blk.media.url = blk.url;
          if (!blk.media.type && blk.mediaType) blk.media.type = blk.mediaType;
          const fgH = document.createElement('div');
          fgH.className = 'field-group';
          const lblH = document.createElement('label');
          lblH.textContent = 'Height (px)';
          const inputH = document.createElement('input');
          inputH.type = 'number';
          inputH.value = blk.height ? parseInt(blk.height, 10) : '';
          inputH.addEventListener('input', () => {
            blk.height = inputH.value ? inputH.value + 'px' : '';
          });
          fgH.append(lblH, inputH);
          typeFields.append(fgH);
          break;
        case 'checkpoint':
          addSelect(typeFields, 'Variant', blk, 'variant', [
            'none', 'multiple_choice', 'short_answer', 'rubric', 'link', 'rich_text'
          ]);
          blk.questionBlocks = blk.questionBlocks || [];
          const qContainer = document.createElement('div');
          qContainer.className = 'question-container';
          blk.questionBlocks.forEach((qb, qidx) => {
            const qbDiv = document.createElement('div');
            qbDiv.className = 'question-item card';
            const qbHeader = document.createElement('div');
            qbHeader.className = 'card-header';
            qbHeader.textContent = `Question Part ${qidx + 1}`;
            qbDiv.append(qbHeader);
            addSelect(qbDiv, 'Type', qb, 'type', ['text', 'code', 'media']);
            const qbFields = document.createElement('div');
            qbFields.className = 'field-group qb-fields';
            qbDiv.append(qbFields);
            function renderQBFields() {
              qbFields.innerHTML = '';
              switch (qb.type) {
                case 'text':
                  addTextarea(qbFields, 'Text', qb, 'text');
                  break;
                case 'code':
                  addTextarea(qbFields, 'Code', qb, 'code');
                  addSelect(qbFields, 'Language', qb, 'language', ['python', 'java', 'html', 'css', 'js']);
                  break;
                case 'media':
                  addSelect(qbFields, 'Media Type', qb, 'mediaType', ['image', 'video']);
                  addField(qbFields, 'URL', qb, 'url');
                  const fgQH = document.createElement('div');
                  fgQH.className = 'field-group';
                  const lblQH = document.createElement('label');
                  lblQH.textContent = 'Height (px)';
                  const inputQH = document.createElement('input');
                  inputQH.type = 'number';
                  inputQH.value = qb.height ? parseInt(qb.height, 10) : '';
                  inputQH.addEventListener('input', () => {
                    qb.height = inputQH.value ? inputQH.value + 'px' : '';
                  });
                  fgQH.append(lblQH, inputQH);
                  qbFields.append(fgQH);
                  break;
              }
            }
            qbDiv.querySelector('select').addEventListener('change', renderQBFields);
            renderQBFields();
            const remQB = document.createElement('button');
            remQB.type = 'button';
            remQB.textContent = 'Remove Part';
            remQB.addEventListener('click', () => {
              blk.questionBlocks.splice(qidx, 1);
              renderSectionGroups();
            });
            qbDiv.append(remQB);
            qContainer.append(qbDiv);
          });
          const addQBBtn = document.createElement('button');
          addQBBtn.type = 'button';
          addQBBtn.textContent = '+ Add Question Block';
          addQBBtn.addEventListener('click', () => {
            blk.questionBlocks.push({ type: 'text', text: '' });
            renderSectionGroups();
          });
          typeFields.append(qContainer, addQBBtn);
          const choicesContainer = document.createElement('div');
          choicesContainer.className = 'choices-container';
          blk.choices = blk.choices || [];
          blk.choices.forEach((choice, cidx) => {
            const choiceDiv = document.createElement('div');
            choiceDiv.className = 'choice-item card';
            const choiceHeader = document.createElement('div');
            choiceHeader.className = 'card-header';
            choiceHeader.textContent = `Choice ${cidx + 1}`;
            choiceDiv.append(choiceHeader);
            const chFields = document.createElement('div');
            chFields.className = 'field-group type-fields ch-fields';
            choiceDiv.append(chFields);
            function renderChFields() {
              chFields.innerHTML = '';
              addSelect(chFields, 'Type', choice, 'type', ['text', 'code', 'media']);
              chFields.querySelector('select').addEventListener('change', renderChFields);
              switch (choice.type) {
                case 'text':
                  addTextarea(chFields, 'Text', choice, 'text');
                  break;
                case 'code':
                  addTextarea(chFields, 'Code', choice, 'code');
                  addSelect(chFields, 'Language', choice, 'language', ['python', 'java', 'html', 'css', 'js']);
                  break;
                case 'media':
                  addSelect(chFields, 'Media Type', choice, 'mediaType', ['image', 'video']);
                  addField(chFields, 'URL', choice, 'url');
                  const fgCH = document.createElement('div');
                  fgCH.className = 'field-group';
                  const lblCH = document.createElement('label');
                  lblCH.textContent = 'Height (px)';
                  const inputCH = document.createElement('input');
                  inputCH.type = 'number';
                  inputCH.value = choice.height ? parseInt(choice.height, 10) : '';
                  inputCH.addEventListener('input', () => {
                    choice.height = inputCH.value ? inputCH.value + 'px' : '';
                  });
                  fgCH.append(lblCH, inputCH);
                  chFields.append(fgCH);
                  break;
              }
              addCheckbox(chFields, 'Correct', choice, 'correct');
            }
            renderChFields();
            const remChoiceBtn = document.createElement('button');
            remChoiceBtn.type = 'button';
            remChoiceBtn.textContent = 'Remove Choice';
            remChoiceBtn.addEventListener('click', () => {
              blk.choices.splice(cidx, 1);
              renderSectionGroups();
            });
            choiceDiv.append(remChoiceBtn);
            choicesContainer.append(choiceDiv);
          });
          const addChoiceBtn = document.createElement('button');
          addChoiceBtn.type = 'button';
          addChoiceBtn.textContent = '+ Add Choice';
          addChoiceBtn.addEventListener('click', () => {
            blk.choices.push({ type: 'text', text: '', explanation: [] });
            renderSectionGroups();
          });
          typeFields.append(choicesContainer, addChoiceBtn);
          blk.explanation = blk.explanation || [];
          const exCont = document.createElement('div');
          exCont.className = 'explanation-container';
          blk.explanation.forEach((ex, eidx) => {
            const exCard = document.createElement('div');
            exCard.className = 'card';
            const exHdr = document.createElement('div');
            exHdr.className = 'card-header';
            exHdr.textContent = `Explanation ${eidx + 1}`;
            const exBody = document.createElement('div');
            exBody.className = 'card-body';
            exCard.append(exHdr, exBody);
            addSelect(exBody, 'Type', ex, 'type', ['text', 'media']);
            function renderExFields() {
              exBody.querySelectorAll('.field-group:not(:first-child)').forEach(n => n.remove());
              if (ex.type === 'text') {
                addTextarea(exBody, 'Text', ex, 'text');
              } else {
                addSelect(exBody, 'Media Type', ex, 'mediaType', ['image', 'video']);
                addField(exBody, 'URL', ex, 'url');
              }
            }
            exCard.querySelector('select').addEventListener('change', renderExFields);
            renderExFields();
            const remEx = document.createElement('button');
            remEx.type = 'button';
            remEx.textContent = 'Remove Explanation';
            remEx.addEventListener('click', () => { blk.explanation.splice(eidx, 1); renderSectionGroups(); });
            exBody.append(remEx);
            exCont.append(exCard);
          });
          const addExBtn = document.createElement('button');
          addExBtn.type = 'button';
          addExBtn.textContent = '+ Add Explanation';
          addExBtn.addEventListener('click', () => {
            blk.explanation.push({ id: genUUID(), type: 'text', text: '' });
            renderSectionGroups();
          });
          exCont.append(addExBtn);
          typeFields.append(exCont);
          addTextarea(typeFields, 'Placeholder', blk, 'placeholder');
          addTextarea(typeFields, 'Error Message', blk, 'errorMsg');
          const fgSub = document.createElement('div');
          fgSub.className = 'field-group';
          const lblSub = document.createElement('label');
          lblSub.textContent = 'Is Submission';
          const chkSub = document.createElement('input');
          chkSub.type = 'checkbox';
          chkSub.checked = blk.is_submission || false;
          chkSub.addEventListener('change', () => { blk.is_submission = chkSub.checked; });
          fgSub.append(lblSub, chkSub);
          typeFields.append(fgSub);
          const fgVal = document.createElement('div');
          fgVal.className = 'field-group';
          const lblVal = document.createElement('label');
          lblVal.textContent = 'Require Validation';
          const chkVal = document.createElement('input');
          chkVal.type = 'checkbox';
          chkVal.checked = blk.requireValidation || false;
          chkVal.addEventListener('change', () => { blk.requireValidation = chkVal.checked; });
          fgVal.append(lblVal, chkVal);
          typeFields.append(fgVal);
          if (blk.requireValidation) {
            addField(typeFields, 'Validation URL', blk, 'validationUrl');
            addSelect(typeFields, 'Validation Variant', blk, 'validationVariant', ['cospaces']);
          }
          const fgCats = document.createElement('div');
          fgCats.className = 'field-group';
          const labelCats = document.createElement('label');
          labelCats.textContent = 'Categories';
          const catsContainer = document.createElement('div');
          catsContainer.className = 'tag-list';
          blk.categories.forEach((cat, cidx) => {
            const tagDiv = document.createElement('div');
            tagDiv.className = 'tag-item';
            const input = document.createElement('input');
            input.type = 'text';
            input.value = cat;
            input.addEventListener('input', () => blk.categories[cidx] = input.value);
            const delBtn = document.createElement('button');
            delBtn.type = 'button';
            delBtn.textContent = '×';
            delBtn.addEventListener('click', () => {
              blk.categories.splice(cidx, 1);
              renderBlockTypeFields();
            });
            tagDiv.append(input, delBtn);
            catsContainer.append(tagDiv);
          });
          const addVocabCatBtn = document.createElement('button');
          addVocabCatBtn.type = 'button';
          addVocabCatBtn.textContent = '+ Add Category';
          addVocabCatBtn.style.minWidth = '140px';
          addVocabCatBtn.addEventListener('click', () => {
            blk.categories.push({ id: genUUID(), terms: [] });
            renderBlockTypeFields();
          });
          fgCats.append(labelCats, catsContainer, addVocabCatBtn);
          typeFields.append(fgCats);
          break;
        case 'rubric':
          addField(typeFields, 'Title', blk, 'title');
          break;
        case 'framed-text':
          addField(typeFields, 'Title', blk, 'title');
          addTextarea(typeFields, 'Text', blk, 'text');
          break;
        case 'framed-table':
          addField(typeFields, 'Title', blk, 'title');
          const rowContainer = document.createElement('div');
          rowContainer.className = 'framed-table-rows';
          blk.table = blk.table || [];
          blk.table.forEach((row, ridx) => {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'framed-table-row card';
            const rowHeader = document.createElement('div');
            rowHeader.className = 'card-header';
            rowHeader.textContent = `Row ${ridx + 1}`;
            rowDiv.append(rowHeader);
            const cellFg = document.createElement('div');
            cellFg.className = 'field-group';
            const cellLbl = document.createElement('label');
            cellLbl.textContent = 'Cell';
            const cellTa = document.createElement('textarea');
            cellTa.value = row[0] || '';
            cellTa.addEventListener('input', () => row[0] = cellTa.value);
            cellFg.append(cellLbl, cellTa);
            rowDiv.append(cellFg);
            const rowCtrl = document.createElement('div');
            ['↑', '↓', '×'].forEach(sym => {
              const btn = document.createElement('button');
              btn.textContent = sym;
              btn.className = 'move-btn';
              btn.type = 'button';
              btn.addEventListener('click', () => {
                if (sym === '×') blk.table.splice(ridx, 1);
                if (sym === '↑' && ridx > 0) [blk.table[ridx - 1], blk.table[ridx]] = [blk.table[ridx], blk.table[ridx - 1]];
                if (sym === '↓' && ridx < blk.table.length - 1) [blk.table[ridx + 1], blk.table[ridx]] = [blk.table[ridx], blk.table[ridx + 1]];
                renderSectionGroups();
              });
              rowCtrl.append(btn);
            });
            rowDiv.append(rowCtrl);
            rowContainer.append(rowDiv);
          });
          const addRowBtn = document.createElement('button');
          addRowBtn.type = 'button';
          addRowBtn.textContent = '+ Add Row';
          addRowBtn.addEventListener('click', e => {
            e.preventDefault();
            blk.table.push(['']);
            renderSectionGroups();
          });
          typeFields.append(rowContainer, addRowBtn);
          break;
        case 'vocabulary':
          addField(typeFields, 'Title', blk, 'title');
          blk.categories = blk.categories || [];
          const vocabContainer = document.createElement('div');
          vocabContainer.className = 'vocab-container';
          blk.categories.forEach((cat, cidx) => {
            const catCard = document.createElement('div');
            catCard.className = 'card';
            const catHeader = document.createElement('div');
            catHeader.className = 'card-header';
            catHeader.textContent = `Category ${cidx + 1}`;
            catCard.append(catHeader);

            const catBody = document.createElement('div');
            catBody.className = 'card-body';

            const fgID = document.createElement('div');
            fgID.className = 'field-group';
            const lblID = document.createElement('label');
            lblID.textContent = 'Category ID';
            const inputID = document.createElement('input');
            inputID.type = 'text';
            inputID.value = cat.id || '';
            inputID.addEventListener('input', () => cat.id = inputID.value);
            fgID.append(lblID, inputID);
            catBody.append(fgID);

            const termList = document.createElement('div');
            termList.className = 'tag-list';
            cat.terms = cat.terms || [];
            cat.terms.forEach((term, tidx) => {
              const termDiv = document.createElement('div');
              termDiv.className = 'tag-item';
              const input = document.createElement('input');
              input.type = 'text';
              input.value = term;
              input.addEventListener('input', () => cat.terms[tidx] = input.value);
              const delBtn = document.createElement('button');
              delBtn.type = 'button';
              delBtn.textContent = '×';
              delBtn.addEventListener('click', () => {
                cat.terms.splice(tidx, 1);
                renderBlockTypeFields();
              });
              termDiv.append(input, delBtn);
              termList.append(termDiv);
            });
            const addTermBtn = document.createElement('button');
            addTermBtn.type = 'button';
            addTermBtn.textContent = '+ Add Term';
            addTermBtn.style.minWidth = '140px';
            addTermBtn.addEventListener('click', () => {
              cat.terms.push('');
              renderBlockTypeFields();
            });
            catBody.append(termList, addTermBtn);
            catCard.append(catBody);
            createMoveDeleteControls(catCard, blk.categories, cidx, renderSectionGroups);
            vocabContainer.append(catCard);
          });
          const addCatBtn = document.createElement('button');
          addCatBtn.type = 'button';
          addCatBtn.textContent = '+ Add Category';
          addCatBtn.addEventListener('click', e => {
            e.preventDefault();
            blk.categories.push({ id: '', terms: [] });
            renderSectionGroups();
          });
          typeFields.append(vocabContainer, addCatBtn);
          break;
      }
      // --- END COPY OF SWITCH LOGIC ---
    }
    // Bind and initial render
    const typeSelect = typeFields.previousElementSibling.querySelector('select');
    typeSelect.addEventListener('change', renderBlockTypeFields);
    renderBlockTypeFields();
    blkList.append(blkCard);
  });
  const addBlkBtn = document.createElement('button');
  addBlkBtn.setAttribute('type', 'button');
  addBlkBtn.textContent = '+ Add Block';
  addBlkBtn.addEventListener('click', e => {
    e.preventDefault();
    bg.blocks.push({ id: genUUID(), type: 'text' });
    renderSectionGroups();
  });
  blkList.append(addBlkBtn);
}