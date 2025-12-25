import React from 'react';

const SimpleCalendar = ({ value, onChange }) => {
  const currentDate = value || new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  
  const days = [];
  
  // Empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
  }
  
  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentYear, currentMonth, day);
    const isToday = date.toDateString() === new Date().toDateString();
    const isSelected = value && date.toDateString() === value.toDateString();
    
    days.push(
      <div
        key={day}
        className={`calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
        onClick={() => onChange(date)}
      >
        {day}
      </div>
    );
  }
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const goToPreviousMonth = () => {
    onChange(new Date(currentYear, currentMonth - 1, 1));
  };
  
  const goToNextMonth = () => {
    onChange(new Date(currentYear, currentMonth + 1, 1));
  };
  
  return (
    <div className="simple-calendar">
      <div className="calendar-header">
        <button onClick={goToPreviousMonth}>‹</button>
        <h3>{monthNames[currentMonth]} {currentYear}</h3>
        <button onClick={goToNextMonth}>›</button>
      </div>
      <div className="calendar-days-header">
        {dayNames.map(day => (
          <div key={day} className="day-name">{day}</div>
        ))}
      </div>
      <div className="calendar-grid">
        {days}
      </div>
    </div>
  );
};

export default SimpleCalendar;