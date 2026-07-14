import React, { useEffect, useState } from "react";
import { API_BASE } from "../config";

const DateTimeBanner = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [academicDay, setAcademicDay] = useState(null);
  const [loading, setLoading] = useState(true);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format date
  const formatLongDate = (date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  // Format time
  const formatTime = (date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  // Format today's date in local time as YYYY-MM-DD
  const y = currentTime.getFullYear();
  const m = String(currentTime.getMonth() + 1).padStart(2, "0");
  const d = String(currentTime.getDate()).padStart(2, "0");
  const localToday = `${y}-${m}-${d}`;

  // Fetch academic day information
  useEffect(() => {
    const fetchDayInfo = async () => {
      try {
        setLoading(true);

        const user = JSON.parse(localStorage.getItem("user"));

        if (!user?.token) {
          setLoading(false);
          return;
        }

        const res = await fetch(
          `${API_BASE}/api/schedule/today?date=${localToday}`,
          {
            headers: {
              Authorization: `Bearer ${user.token}`,
            },
          }
        );

        if (res.ok) {
          const data = await res.json();
          setAcademicDay(data);
        } else {
          setAcademicDay(null);
        }
      } catch (err) {
        console.error("Error fetching academic day:", err);
        setAcademicDay(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDayInfo();
  }, [localToday]);

  return (
    <div className="time-banner animate-fade">
      <div className="flex flex-col">
        <span className="time-date-label">
          {formatLongDate(currentTime)}
        </span>

        <div className="flex items-center gap-2 mt-1">
          {loading ? (
            <span className="text-xs text-muted animate-pulse">
              Loading Day Info...
            </span>
          ) : academicDay ? (
            academicDay.isHoliday ? (
              <span className="badge badge-absent">
                {academicDay.description || "Holiday"}
              </span>
            ) : (
              <span className="time-day-badge">
                {academicDay.description ||
                  `Day ${academicDay.dayNumber}`}
              </span>
            )
          ) : (
            <span className="text-xs text-muted">
              No Day Information
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end">
        <span className="time-clock">
          {formatTime(currentTime)}
        </span>

        <span className="text-xs text-muted">
          ● Live Sync
        </span>
      </div>
    </div>
  );
};

export default DateTimeBanner;