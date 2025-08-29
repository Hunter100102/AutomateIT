
// reviews.js — renders widget + handles submission
(function(){
  const root = document.getElementById('reviews-widget');
  if(!root) return;
  const listUrl = root.dataset.endpoint;
  const postUrl = root.dataset.post;
  const PAGE_SIZE = 5;
  let page = 1, total = 0, items = [];

  function starEl(n){ return '★'.repeat(n) + '☆'.repeat(5-n); }

  function render(){
    root.innerHTML = '';
    const head = document.createElement('div');
    head.className = 'reviews-header';
    head.innerHTML = `<div class="reviews-title">What clients say</div>
      <a class="reviews-cta" href="#leave-review">Leave a review →</a>`;
    root.appendChild(head);

    const start = (page-1)*PAGE_SIZE;
    const slice = items.slice(start, start+PAGE_SIZE);
    if(slice.length === 0){
      const p = document.createElement('p'); p.textContent = 'No reviews yet — be the first!'; root.appendChild(p);
    } else {
      slice.forEach(r => {
        const card = document.createElement('div');
        card.className = 'review-card';
        const status = r.status || 'pending';
        card.innerHTML = `
          <div class="review-meta">
            <div><strong>${r.name || 'Anonymous'}</strong> · <span class="stars">${starEl(r.stars||5)}</span></div>
            <div class="pill ${status==='approved'?'badge-approved':'badge-pending'}">${status}</div>
          </div>
          <div class="review-content">${(r.content||'').replace(/[<>]/g,'')}</div>
        `;
        root.appendChild(card);
      });
    }

    // pagination
    const pag = document.createElement('div');
    pag.className = 'pagination';
    const prev = document.createElement('button'); prev.className = 'page-btn'; prev.textContent = 'Prev'; prev.disabled = page===1;
    const next = document.createElement('button'); next.className = 'page-btn'; next.textContent = 'Next'; next.disabled = page*PAGE_SIZE>=items.length;
    prev.onclick = ()=>{ page-=1; render(); };
    next.onclick = ()=>{ page+=1; render(); };
    pag.appendChild(prev); pag.appendChild(next);
    root.appendChild(pag);

    // form
    const form = document.createElement('form');
    form.className = 'form-wrap'; form.id = 'leave-review';
    form.innerHTML = `
      <h3>Leave a review</h3>
      <input type="text" name="website" style="display:none" tabindex="-1" autocomplete="off" />
      <label>Full Name</label>
      <input class="input" name="name" placeholder="Jane Doe" required/>
      <label>Stars</label>
      <select class="input" name="stars">
        <option>5</option><option>4</option><option>3</option><option>2</option><option>1</option>
      </select>
      <label>Your review</label>
      <textarea class="input" name="content" rows="4" minlength="10" maxlength="1000" placeholder="Tell others about your experience..." required></textarea>
      <button class="submit" type="submit">Submit review</button>
    `;
    form.onsubmit = async (e)=>{
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      if((data.website||'').trim()!==''){
        alert('Submission blocked'); return;
      }
      const res = await fetch(postUrl,{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({name:data.name, stars:+data.stars, content:data.content})});
      if(!res.ok){ alert('Error submitting review.'); return; }
      form.reset();
      alert('Thanks! Your review will appear once approved.');
    };
    root.appendChild(form);
  }

  async function load(){
    try{
      const res = await fetch(listUrl);
      if(!res.ok) throw new Error('Bad response');
      const json = await res.json();
      items = Array.isArray(json.items) ? json.items : [];
      // show approved first
      items.sort((a,b)=> (b.status==='approved') - (a.status==='approved'));
      render();
    }catch(e){
      root.innerHTML = '<p>Reviews are unavailable right now.</p>';
    }
  }
  load();
})();
