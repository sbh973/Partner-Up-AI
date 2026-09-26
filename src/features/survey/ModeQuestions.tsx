import type { ExploreRole, GroupPreference, Mode, StudyStyle } from '../../../shared/types';
import { EXPLORE_ROLES, GROUP_PREFERENCES, STUDY_STYLES } from '../../../shared/types';
import { GROUP_PREFERENCE_LABELS, ROLE_LABELS, STUDY_STYLE_LABELS } from '../../../shared/labels';
import { LanguagesEditor } from '../../components/profile/LanguagesEditor';
import { ChoiceChips } from '../../components/ui/ChoiceChips';
import { TextAreaField, TextField } from '../../components/ui/Field';
import { TagInput } from '../../components/ui/TagInput';
import type { SurveyState } from './surveyState';

const SUBJECTS = ['Calculus', 'Chemistry', 'Physics', 'Python', 'Biology', 'Statistics', 'Linear algebra', 'Organic chemistry', 'Java', 'Economics'];

interface Props {
  state: SurveyState;
  update: (patch: Partial<SurveyState>) => void;
  updateProfile: (patch: Partial<SurveyState['profile']>) => void;
}

function ConnectQuestions({ state, update, updateProfile }: Props) {
  return (
    <>
      <TagInput
        label="What do you enjoy doing?"
        value={state.profile.interests}
        onChange={(interests) => updateProfile({ interests })}
        suggestions={['Gaming', 'Soccer', 'Music', 'F1', 'Photography', 'Anime', 'Hiking', 'Food', 'Movies', 'Basketball']}
      />
      <TagInput
        label="What games do you play?"
        value={state.activities}
        onChange={(activities) => update({ activities })}
        suggestions={['Valorant', 'League of Legends', 'Minecraft', 'Fortnite', 'Rocket League', 'Overwatch', 'EA FC', 'Chess']}
        optional
      />
      <ChoiceChips
        label="What kind of connection are you looking for?"
        options={['Gaming partners', 'New friends', 'Watch parties', 'Event buddies', 'Discord groups'].map((v) => ({ value: v, label: v }))}
        value={state.connectSeeks}
        onChange={(connectSeeks) => update({ connectSeeks })}
      />
      <TextAreaField
        label="Describe the kind of person or group you’d like to meet"
        value={state.lookingFor}
        onChange={(e) => update({ lookingFor: e.target.value })}
        placeholder="A couple of people to queue ranked with after 9pm…"
        maxLength={280}
        optional
      />
    </>
  );
}

function LearnQuestions({ state, update, updateProfile }: Props) {
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <TagInput label="What are you strong in?" value={state.strengths} onChange={(strengths) => update({ strengths })} suggestions={SUBJECTS} hint="What you could help someone else with." />
        <TagInput label="What do you need help with?" value={state.needs} onChange={(needs) => update({ needs })} suggestions={SUBJECTS} />
      </div>
      <TagInput label="Courses you’re taking" value={state.courses} onChange={(courses) => update({ courses })} placeholder="e.g. MATH 1552" max={8} optional />
      <LanguagesEditor value={state.profile.languages} onChange={(languages) => updateProfile({ languages })} />
      <ChoiceChips<StudyStyle>
        label="How do you like to study?"
        options={STUDY_STYLES.map((v) => ({ value: v, label: STUDY_STYLE_LABELS[v] }))}
        value={state.studyStyles}
        onChange={(studyStyles) => update({ studyStyles })}
      />
      <ChoiceChips<GroupPreference>
        label="Pair or group?"
        single
        options={GROUP_PREFERENCES.map((v) => ({ value: v, label: GROUP_PREFERENCE_LABELS[v] }))}
        value={[state.groupPreference]}
        onChange={([groupPreference]) => groupPreference && update({ groupPreference })}
      />
      <TextAreaField
        label="Anything else a study partner should know?"
        value={state.lookingFor}
        onChange={(e) => update({ lookingFor: e.target.value })}
        placeholder="Midterm in 3 weeks — I explain things best with practice problems."
        maxLength={280}
        optional
      />
    </>
  );
}

function ExploreQuestions({ state, update, updateProfile }: Props) {
  const isLocal = state.role === 'local';
  return (
    <>
      <ChoiceChips<ExploreRole>
        label="Which describes you?"
        single
        options={EXPLORE_ROLES.map((v) => ({ value: v, label: ROLE_LABELS[v] }))}
        value={[state.role]}
        onChange={([role]) => role && update({ role })}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label={isLocal ? 'Which city do you live in?' : 'Where are you (or heading)?'}
          value={state.exploringCity}
          onChange={(e) => update({ exploringCity: e.target.value })}
          placeholder="Atlanta"
          maxLength={80}
        />
        <TextField
          label="Where are you from?"
          value={state.origin}
          onChange={(e) => update({ origin: e.target.value })}
          placeholder="Only if you want to share"
          maxLength={60}
          optional
        />
      </div>
      <LanguagesEditor value={state.profile.languages} onChange={(languages) => updateProfile({ languages })} />
      <TagInput
        label="What would you like to do?"
        value={state.exploreActivities}
        onChange={(exploreActivities) => update({ exploreActivities })}
        suggestions={['Food', 'Photography', 'Museums', 'Markets', 'Hiking', 'Coffee', 'Concerts', 'Parks', 'Nightlife', 'Exploring the city']}
      />
      <ChoiceChips
        label="What kind of connection are you looking for?"
        options={(isLocal
          ? ['Meeting people from abroad', 'Cultural exchange', 'New friends']
          : ['A local friend', 'Exploring the city', 'Cultural exchange', 'New friends']
        ).map((v) => ({ value: v, label: v }))}
        value={state.exploreSeeks}
        onChange={(exploreSeeks) => update({ exploreSeeks })}
      />
      <ChoiceChips
        label="What can you offer?"
        options={(isLocal ? ['Showing people around', 'A local friend', 'Cultural exchange'] : ['Cultural exchange', 'Language practice']).map((v) => ({ value: v, label: v }))}
        value={state.exploreOffers}
        onChange={(exploreOffers) => update({ exploreOffers })}
      />
      <TextAreaField
        label="In your own words"
        value={state.lookingFor}
        onChange={(e) => update({ lookingFor: e.target.value })}
        placeholder={isLocal ? 'I love showing newcomers the best food spots…' : 'Just moved here and don’t know anyone yet…'}
        maxLength={280}
        optional
      />
    </>
  );
}

export function ModeQuestions({ mode, ...props }: Props & { mode: Mode }) {
  if (mode === 'learn') return <LearnQuestions {...props} />;
  if (mode === 'explore') return <ExploreQuestions {...props} />;
  return <ConnectQuestions {...props} />;
}
