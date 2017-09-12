$(document).ready(function() {

    function getByDayList(meeting_days) {
        var byDayList = [];
        if (meeting_days.sunday) {
            byDayList.push("SU");
        }
        if (meeting_days.monday) {
            byDayList.push("MO");
        }
        if (meeting_days.tuesday) {
            byDayList.push("TU");
        }
        if (meeting_days.wednesday) {
            byDayList.push("WE");
        }
        if (meeting_days.thursday) {
            byDayList.push("TH");
        }
        if (meeting_days.friday) {
            byDayList.push("FR");
        }
        if (meeting_days.saturday) {
            byDayList.push("SA");
        }
        return byDayList;
    };

    function getTimeZoneComponent() {
        var vtimezone = new ICAL.Component(['vtimezone', [], []]);
        
        vtimezone.addPropertyWithValue('tzid', 'America/Los_Angeles');

        var standardTime = new ICAL.Component('standard');
        standardTime.addPropertyWithValue('dtstart', new ICAL.Time({
            year: 1971,
            month: 01,
            day: 01,
            hour: 2
        }));
        standardTime.addPropertyWithValue('tzoffsetto', '-08:00');
        standardTime.addPropertyWithValue('tzoffsetfrom', '-07:00');
        standardTime.addPropertyWithValue('tzname', 'PST');
        standardTime.addPropertyWithValue('rrule', new ICAL.Recur({
            freq: 'YEARLY',
            bymonth: 11,
            byday: '1SU',
            interval: 1
        }));

        var daylightTime = new ICAL.Component('daylight');
        daylightTime.addPropertyWithValue('dtstart', new ICAL.Time({
            year: 1971,
            month: 01,
            day: 01,
            hour: 2
        }));
        daylightTime.addPropertyWithValue('tzoffsetto', '-07:00');
        daylightTime.addPropertyWithValue('tzoffsetfrom', '-08:00');
        daylightTime.addPropertyWithValue('tzname', 'PDT');
        daylightTime.addPropertyWithValue('rrule', new ICAL.Recur({
            freq: 'YEARLY',
            bymonth: 3,
            byday: '2SU',
            interval: 1
        }));

        vtimezone.addSubcomponent(standardTime);
        vtimezone.addSubcomponent(daylightTime);
        return vtimezone;
    }

    function getVeventForClassMeeting(meeting, section, startDate, untilDate, timezone) {
        var vevent = new ICAL.Component('vevent');
        var event = new ICAL.Event(vevent);

        event.summary = section.curriculum_abbr + " " + section.course_number + " " + section.section_id;
        
        var byDayList = getByDayList(meeting.meeting_days);
        vevent.addPropertyWithValue('rrule', new ICAL.Recur({
            freq: 'WEEKLY',
            byday: byDayList,
            until: untilDate,
        }));
        
        var eventStartTime = new ICAL.Time({
            year: startDate.year,
            month: startDate.month,
            day: startDate.day,
            hour: parseInt(meeting.start_time.split(":")[0]),
            minute: parseInt(meeting.start_time.split(":")[1]),
            isDate: false
        }, timezone);
        
        var eventEndTime = new ICAL.Time({
            year: startDate.year,
            month: startDate.month,
            day: startDate.day,
            hour: parseInt(meeting.end_time.split(":")[0]),
            minute: parseInt(meeting.end_time.split(":")[1]),
            isDate: false
        }, timezone);

        for (var d = 0; d < 7; d++) {
            if (byDayList.indexOf(daysOfWeek[eventStartTime.dayOfWeek() - 1]) >= 0) {
                break;
            }
            eventStartTime.adjust(1,0,0,0);
            eventEndTime.adjust(1,0,0,0);
        }

        event.startDate = eventStartTime;
        event.endDate = eventEndTime;

        if (!meeting.building_tbd && !meeting.room_tbd) {
            event.location = meeting.building + " " + meeting.room;
        }

        return vevent;
    }

    function getVeventForClassFinal(finalExam, section, startDate, untilDate, timezone) {
        var vevent = new ICAL.Component('vevent');
        var event = new ICAL.Event(vevent);

        event.summary = section.curriculum_abbr + " " + section.course_number + " " + section.section_id + " Final";
        
        var date = finalExam.start_date.split(" ")[0].split("-");
        var examStartTime = finalExam.start_date.split(" ")[1].split(":");
        var examEndTime = finalExam.end_date.split(" ")[1].split(":");

        var eventStartTime = new ICAL.Time({
            year: parseInt(date[0]),
            month: parseInt(date[1]),
            day: parseInt(date[2]),
            hour: parseInt(examStartTime[0]),
            minute: parseInt(examStartTime[1]),
            isDate: false
        }, timezone);
        
        var eventEndTime = new ICAL.Time({
            year: parseInt(date[0]),
            month: parseInt(date[1]),
            day: parseInt(date[2]),
            hour: parseInt(examEndTime[0]),
            minute: parseInt(examEndTime[1]),
            isDate: false
        }, timezone);

        event.startDate = eventStartTime;
        event.endDate = eventEndTime;

        if (finalExam.building && finalExam.room_number) {
            event.location = finalExam.building + " " + finalExam.room_number;
        }

        return vevent;
    }

    const daysOfWeek = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

    var searchLinks = $(".myuw-search-links");
    var newLink = $(".myuw-search-links a:first").clone();
    newLink.attr({
        href: "javascript:void(0);",
        title: "Export schedule as iCal",
    });
    newLink.on('click', function() {
        var queryUrl = "https://my.uw.edu/api/v1/schedule/current";
        $.getJSON(queryUrl, function(response) {
            console.log(response);
            // Setup iCal information.
            var comp = new ICAL.Component(['vcalendar', [], []]);
            comp.addPropertyWithValue('version', '2.0');
            comp.updatePropertyWithValue('prodid', '-//UW iCal by Kyle Yan');
            var vtimezone = getTimeZoneComponent();
            comp.addSubcomponent(vtimezone);
            var timezone = new ICAL.Timezone(vtimezone);
            var sections = response.sections;
            var startDate = ICAL.Time.fromDateString(response.term.first_day_quarter);
            var untilDate = ICAL.Time.fromDateString(response.term.last_day_instruction);
            untilDate.adjust(1,0,0,0);
            for (var i = 0; i < sections.length; i++) {
                var section = sections[i];
                var meetings = section.meetings;
                for (var j = 0; j < meetings.length; j++) {
                    var meeting = meetings[j];
                    if (!meeting.no_meeting && !meeting.days_tbd && !meeting.wont_meet) {
                        comp.addSubcomponent(getVeventForClassMeeting(meeting, section, startDate, untilDate, timezone));
                    }
                }
                var finalExam = section.final_exam;
                if (finalExam && finalExam.start_date && finalExam.end_date) {
                    comp.addSubcomponent(getVeventForClassFinal(finalExam, section, startDate, untilDate, timezone));
                }
            }
            console.log("iCal info:");
            console.log(comp.toString());
            var blob = new Blob([comp], {type: "text/plain;charset=utf-8"});
            saveAs(blob, "uwschedule.ics");
        });
    });
    var icon = newLink.children("i");   
    icon.attr({
        class: "fa fa-calendar"
    });
    var text = newLink.children("span");
    text.html("Export Schedule");
    $(".myuw-search-links").prepend(newLink);
}); 
