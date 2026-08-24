import { useMemo, useState } from 'react';

type Option = {
  value: string;
  label: string;
};

export function CheckboxMultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Select options',
}: {
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selectedOptions = useMemo(
    () => options.filter((option) => value.includes(option.value)),
    [options, value],
  );
  const allSelected = options.length > 0 && value.length === options.length;
  const partiallySelected = value.length > 0 && !allSelected;

  function toggleValue(optionValue: string) {
    onChange(
      value.includes(optionValue)
        ? value.filter((item) => item !== optionValue)
        : [...value, optionValue],
    );
  }

  function toggleAll() {
    onChange(allSelected ? [] : options.map((option) => option.value));
  }

  return (
    <div className="checkbox-multiselect">
      <button
        className={`multi-input ${open ? 'is-open' : ''}`}
        type="button"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="multi-tags">
          {selectedOptions.length === 0 ? (
            <span className="multi-placeholder">{placeholder}</span>
          ) : (
            <span className="multi-summary">
              {selectedOptions.length} selected
            </span>
          )}
        </span>
        <span className="multi-actions">
          {value.length > 0 && (
            <span
              role="button"
              tabIndex={0}
              className="multi-clear"
              onClick={(event) => {
                event.stopPropagation();
                onChange([]);
              }}
            >
              x
            </span>
          )}
          <span className="multi-chevron">{open ? '^' : 'v'}</span>
        </span>
      </button>

      {open && (
        <div className="multi-menu">
          <label className="multi-option select-all">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(input) => {
                if (input) input.indeterminate = partiallySelected;
              }}
              onChange={toggleAll}
            />
            <span>Select all</span>
          </label>
          <div className="multi-divider" />
          {options.map((option) => (
            <label className={`multi-option ${value.includes(option.value) ? 'selected' : ''}`} key={option.value}>
              <input
                type="checkbox"
                checked={value.includes(option.value)}
                onChange={() => toggleValue(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
