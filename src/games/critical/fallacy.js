import { defineGame } from '../../core/game.js';
import { el } from '../../ui/dom.js';

export const FALLACIES = {
  adhom: {
    min: 1,
    name: 'Personal attack',
    def: 'Attacking the person making the argument instead of the argument itself.',
  },
  straw: {
    min: 1,
    name: 'Straw man',
    def: 'Misrepresenting someone’s position as a weaker or extreme version, then attacking that.',
  },
  dilemma: { min: 1, name: 'False choice', def: 'Presenting only two options when more exist.' },
  slope: {
    min: 1,
    name: 'Slippery slope',
    def: 'Claiming one step will inevitably lead to an extreme outcome, without showing why.',
  },
  bandwagon: {
    min: 1,
    name: 'Bandwagon',
    def: 'Arguing something is true or good because many people believe or do it.',
  },
  authority: {
    min: 1,
    name: 'Irrelevant authority',
    def: 'Relying on someone’s authority in an area outside their expertise.',
  },
  hasty: {
    min: 4,
    name: 'Hasty generalisation',
    def: 'Drawing a broad conclusion from too few or unrepresentative examples.',
  },
  posthoc: {
    min: 4,
    name: 'False cause',
    def: 'Assuming that because B followed A (or goes along with A), A caused B.',
  },
  circular: {
    min: 4,
    name: 'Circular reasoning',
    def: 'The conclusion is assumed in the premise — the argument goes in a circle.',
  },
  emotion: { min: 4, name: 'Appeal to emotion', def: 'Using feelings (fear, pity, pride) in place of evidence.' },
  herring: {
    min: 7,
    name: 'Red herring',
    def: 'Changing the subject to something irrelevant to dodge the actual issue.',
  },
  sunk: {
    min: 7,
    name: 'Sunk cost',
    def: 'Continuing something because of what’s already been invested, rather than future value.',
  },
  gambler: {
    min: 7,
    name: 'Gambler’s fallacy',
    def: 'Believing independent random events “balance out” — past results change future odds.',
  },
  whatabout: { min: 7, name: 'Whataboutism', def: 'Deflecting criticism by pointing to someone else’s wrongdoing.' },
  nature: {
    min: 7,
    name: 'Appeal to nature',
    def: 'Assuming something is good because it is “natural” (or bad because it isn’t).',
  },
  ignorance: {
    min: 9,
    name: 'Appeal to ignorance',
    def: 'Claiming something is true because it hasn’t been proven false (or false because it hasn’t been proven true).',
  },
  cherry: {
    min: 9,
    name: 'Cherry picking',
    def: 'Pointing only to the evidence that supports a claim while ignoring the evidence against it.',
  },
  scotsman: {
    min: 9,
    name: 'No true Scotsman',
    def: 'Dodging a counterexample by redefining the group so the example “doesn’t count”.',
  },
};
export const ARGS = [
  ['adhom', 'Rahul says we should cut office energy use, but he drives a huge car, so his proposal is nonsense.'],
  ['adhom', 'Why listen to her budget plan? She failed maths in school.'],
  ['adhom', 'The study on sugar was written by someone who’s obviously never been fit a day in their life. Ignore it.'],
  [
    'straw',
    'Meera wants more cycle lanes. So she wants to ban cars completely and make everyone cycle to work in the rain?',
  ],
  ['straw', 'You think we should test the app more before launch? So you’re saying we should never ship anything.'],
  ['straw', 'He argues for a shorter school day. Clearly he doesn’t care about children’s education at all.'],
  ['dilemma', 'Either we hire five new people this month or the company collapses.'],
  ['dilemma', 'You’re either with us on this plan or you’re against the team.'],
  ['dilemma', 'If you don’t study engineering or medicine, you’ll have no career.'],
  ['slope', 'If we let staff work from home on Fridays, soon nobody will come in at all and the office will close.'],
  ['slope', 'If I skip the gym today, I’ll skip tomorrow, then all month, and I’ll end up never exercising again.'],
  ['slope', 'Allow one phone in class and next thing students will be streaming movies during exams.'],
  ['bandwagon', 'Millions of people use this crypto app, so it must be a safe investment.'],
  ['bandwagon', 'Everyone in my building is buying an air purifier, so they obviously work.'],
  ['bandwagon', 'This diet is trending everywhere — it has to be effective.'],
  ['authority', 'A famous cricketer says this mutual fund is the best one, so I’m putting all my savings in it.'],
  ['authority', 'My dentist told me the stock market will crash next month, so I’m selling everything.'],
  ['authority', 'A Nobel-winning physicist said this herbal tea cures colds, so it must.'],
  ['hasty', 'I met two rude people from that city, so people there are rude.'],
  ['hasty', 'My first two online orders from this store were late, so they never deliver on time.'],
  ['hasty', 'My grandfather smoked and lived to 95, so smoking can’t be that harmful.'],
  ['posthoc', 'I wore my lucky shirt and we won the match. The shirt works.'],
  ['posthoc', 'Ice-cream sales and drowning deaths rise together, so ice cream causes drowning.'],
  ['posthoc', 'Since the new manager arrived, sales went up. She must be the reason.'],
  ['circular', 'This news channel is trustworthy because it says it only reports the truth.'],
  ['circular', 'He’s the best candidate because no one is better than him.'],
  ['circular', 'Reading is important because it’s essential to read.'],
  ['emotion', 'Think of the poor puppies — you have to buy this premium pet insurance.'],
  ['emotion', 'If you really loved your family, you’d buy the most expensive car seat.'],
  ['emotion', 'How can you vote against this bill? Imagine how ashamed your children would be.'],
  [
    'herring',
    'Asked why the project is late, the manager said, “Let’s not forget how hard everyone worked at last year’s festival.”',
  ],
  ['herring', 'Sure, the restaurant failed its hygiene check — but have you seen how nice the new menu design is?'],
  ['herring', 'When asked about rising fees, the principal talked about the school’s new logo.'],
  ['sunk', 'I’ve already paid for the whole year at this gym I hate, so I have to keep going.'],
  ['sunk', 'We’ve spent ₹20 lakh on this failing software project — we can’t stop now and waste it.'],
  ['sunk', 'The movie is terrible, but we paid for tickets, so let’s sit through the last hour.'],
  ['gambler', 'The coin has landed heads five times in a row, so tails is due next.'],
  ['gambler', 'This lottery number hasn’t come up in years — it’s bound to win soon.'],
  ['gambler', 'We’ve had three girls, so our next baby is almost certainly a boy.'],
  ['whatabout', 'You say I shouldn’t litter? You left the lights on all night last week!'],
  ['whatabout', 'Why criticise our company’s pollution when other companies pollute more?'],
  ['whatabout', 'Yes, I was late, but you were late twice last month.'],
  ['nature', 'This supplement is all-natural, so it can’t have side effects.'],
  ['nature', 'Humans didn’t evolve to use phones, so they must be bad for us.'],
  ['nature', 'Medicine is chemicals; herbs are natural, so herbs are always the better treatment.'],
  ['adhom', 'Of course the new tax plan is bad — it was written by a bunch of out-of-touch economists.'],
  ['straw', 'She wants stricter rules for food stalls. So she thinks street food should be wiped out entirely?'],
  ['dilemma', 'Either you buy a house before 30 or you’ll be renting forever.'],
  [
    'slope',
    'If we let one customer return an item late, everyone will expect free returns forever and we’ll go bankrupt.',
  ],
  ['bandwagon', 'All my friends have switched to this phone, so it must be the best one.'],
  ['authority', 'A popular film actor says this stock will double, so it’s a sure thing.'],
  ['ignorance', 'Nobody has ever proved that this charm doesn’t bring good luck, so it does.'],
  ['ignorance', 'Scientists can’t explain every detail of how this works, so the whole theory must be wrong.'],
  ['ignorance', 'There’s no evidence the new hire made the mistake, so it must have been the old team.'],
  ['cherry', 'This fund is great — look at its returns in 2021! (It lost money in the four other years.)'],
  ['cherry', 'The brochure quotes the three five-star reviews and none of the forty one-star ones.'],
  ['cherry', 'It snowed heavily this week, so global warming clearly isn’t happening.'],
  ['scotsman', 'No real cricket fan would leave a match early. Ravi left early? Then he’s not a real fan.'],
  ['scotsman', 'True entrepreneurs never take a salary. She took one, so she was never a true entrepreneur.'],
  ['scotsman', 'No genuine yoga practitioner gets back pain. If you do, you weren’t doing real yoga.'],
];

export default defineGame({
  id: 'fallacy',
  skill: 'critical',
  name: 'Fallacy Spotter',
  blurb: 'Name the flaw in the reasoning.',
  howTo: [
    'Read the short argument. Pick the reasoning error it commits.',
    'After each answer you’ll see the definition — that’s how you learn them.',
    '10 arguments. New fallacy types unlock at levels 4, 7 and 9.',
  ],
  levelInfo: (l) => `${Object.values(FALLACIES).filter((f) => f.min <= l).length} fallacy types`,
  tip: 'Ask two questions of any argument: “Is this actually about the claim?” (catches personal attacks, red herrings, whataboutism) and “Does the evidence really reach that far?” (catches generalisations, false cause, slippery slopes).',
  mount(root, ctx) {
    const N = 10;
    const avail = Object.keys(FALLACIES).filter((k) => FALLACIES[k].min <= ctx.level);
    const pool = ctx.rng.shuffle(ARGS.filter((a) => avail.includes(a[0])));
    const qs = pool.slice(0, N).map(([f, text]) => {
      const others = ctx.rng.shuffle(avail.filter((k) => k !== f)).slice(0, 3);
      return { f, text, opts: ctx.rng.shuffle([f, ...others]) };
    });
    let i = 0,
      right = 0,
      busy = false;
    const missed = [];
    const info = el('div', { class: 'statline' });
    const card = el('div', { class: 'arg-card' });
    const opts = el('div', { class: 'choice-grid' });
    const fb = el('div', { class: 'feedback' });
    root.append(info, card, opts, fb);

    function show() {
      const q = qs[i];
      busy = false;
      info.innerHTML = '';
      info.append(el('span', {}, `Argument ${i + 1} of ${qs.length}`), el('span', {}, 'Correct ', el('b', {}, right)));
      card.innerHTML = '';
      card.append(el('p', {}, '“' + q.text + '”'));
      opts.innerHTML = '';
      q.opts.forEach((k) =>
        opts.append(el('button', { class: 'btn', onclick: (e) => pick(k, e.currentTarget) }, FALLACIES[k].name)),
      );
      fb.innerHTML = '';
    }
    function pick(k, btn) {
      if (busy) return;
      busy = true;
      const q = qs[i],
        ok = k === q.f;
      if (ok) right++;
      else missed.push({ q, k });
      btn.classList.add(ok ? 'hit' : 'miss');
      [...opts.children].forEach((b, j) => {
        if (q.opts[j] === q.f) b.classList.add('hit');
      });
      fb.innerHTML = '';
      fb.append(
        el('div', { class: ok ? 'good' : 'bad' }, ok ? '✓ Correct' : `✗ It’s ${FALLACIES[q.f].name}`),
        el('div', { class: 'muted why' }, el('b', {}, FALLACIES[q.f].name + ': '), FALLACIES[q.f].def),
        el(
          'button',
          {
            class: 'btn primary',
            style: { marginTop: '8px' },
            onclick: () => {
              i++;
              if (i >= qs.length)
                ctx.finish({
                  score: (right / qs.length) * 100,
                  summary: `${right} of ${qs.length} fallacies spotted.`,
                  details: missed.length
                    ? el(
                        'div',
                        { class: 'details' },
                        el('b', {}, 'Ones to review'),
                        el(
                          'ul',
                          {},
                          missed.map(({ q, k }) =>
                            el(
                              'li',
                              {},
                              `“${q.text}” — `,
                              el('b', {}, FALLACIES[q.f].name),
                              ` (you said ${FALLACIES[k].name})`,
                            ),
                          ),
                        ),
                      )
                    : null,
                });
              else show();
            },
          },
          i + 1 >= qs.length ? 'See results' : 'Next →',
        ),
      );
    }
    show();
  },
});
