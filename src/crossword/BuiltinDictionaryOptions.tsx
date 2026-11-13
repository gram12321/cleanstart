import { BUILTIN_DICTIONARY_COLLECTIONS, type BuiltinDictionarySettings } from "./dictionary";

export function BuiltinDictionaryOptions({ settings, onChange }: {
  settings: BuiltinDictionarySettings;
  onChange: (next: BuiltinDictionarySettings) => void;
}) {
  return <fieldset className="builtin-dictionary-options">
    <legend>Indbyggede ordbøger</legend>
    <p>Valget gælder ordforslag, autofyldning og nye krydsord.</p>
    <div>{BUILTIN_DICTIONARY_COLLECTIONS.map(({ source, label }) => <label key={source}>
      <input type="checkbox" checked={settings[source]} onChange={event => onChange({ ...settings, [source]: event.target.checked })} />
      <span>{label}</span>
    </label>)}</div>
  </fieldset>;
}
