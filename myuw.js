$(document).ready(function() {
    var searchLinks = $(".myuw-search-links");
    var newLink = $(".myuw-search-links a:first").clone();
    newLink.attr({
        href: "javascript:void(0);",
        title: "Export schedule to iCal",
        "aria-hidden": true
    });
    newLink.on('click', function() {
        var queryUrl = "https://my.uw.edu/api/v1/schedule/2017,autumn";
        $.getJSON(queryUrl, function(response) {
            console.log(response);
            var comp = new ICAL.Component(['vcalendar', [], []]);
            comp.updatePropertyWithValue('prodid', '-//iCal.js Wiki Example');
            var sections = response.sections;
            var startDateArray = response.term.first_day_quarter.split("-");
            var lastDayDateArray = response.term.last_day_instruction.split("-");
            var startDate = new ICAL.Time({
                year: parseInt(startDateArray[0]),
                month: parseInt(startDateArray[1]),
                day: parseInt(startDateArray[2])
            });
            var untilDate = new ICAL.Time({
                year: parseInt(lastDayDateArray[0]),
                month: parseInt(lastDayDateArray[1]),
                day: parseInt(lastDayDateArray[2]),
                hour: 23,
                minute: 59
            });
            for (var i = 0; i < sections.length; i++) {
                var section = sections[i];
                console.log("Course " + i + ": " + section.curriculum_abbr + " " + section.course_number + " " + section.section_id);
                var meetings = section.meetings;
                for (var j = 0; j < meetings.length; j++) {
                    var meeting = meetings[j];
                    var vevent = new ICAL.Component('vevent');
                    var event = new ICAL.Event(vevent);
                    event.summary = section.curriculum_abbr + " " + section.course_number + " " + section.section_id;
                    if (!meeting.no_meeting && !meeting.days_tbd) {
                        var byDayList = [];
                        var dayList = [];
                        if (meeting.meeting_days.sunday) {
                            byDayList.push("SU");
                            dayList.push(1);
                        }
                        if (meeting.meeting_days.monday) {
                            byDayList.push("MO");
                            dayList.push(2);
                        }
                        if (meeting.meeting_days.tuesday) {
                            byDayList.push("TU");
                            dayList.push(3);
                        }
                        if (meeting.meeting_days.wednesday) {
                            byDayList.push("WE");
                            dayList.push(4);
                        }
                        if (meeting.meeting_days.thursday) {
                            byDayList.push("TH");
                            dayList.push(5);
                        }
                        if (meeting.meeting_days.friday) {
                            byDayList.push("FR");
                            dayList.push(6);
                        }
                        if (meeting.meeting_days.saturday) {
                            byDayList.push("SA");
                            dayList.push(7);
                        }

                        console.log(byDayList);

                        var recur = new ICAL.Recur({
                            freq: 'WEEKLY',
                            byday: byDayList,
                            until: untilDate,
                        });

                        vevent.addPropertyWithValue('rrule', recur);

                        var eventStartTime = new ICAL.Time({
                            year: startDate.year,
                            month: startDate.month,
                            day: startDate.day,
                            hour: parseInt(meeting.start_time.split(":")[0]),
                            minute: parseInt(meeting.start_time.split(":")[1]),
                            isDate: false
                        });
                        
                        var eventEndTime = new ICAL.Time({
                            year: startDate.year,
                            month: startDate.month,
                            day: startDate.day,
                            hour: parseInt(meeting.end_time.split(":")[0]),
                            minute: parseInt(meeting.end_time.split(":")[1]),
                            isDate: false
                        });

                        for (var d = 0; d < 7; d++) {
                            if (dayList.indexOf(eventStartTime.dayOfWeek()) >= 0) {
                                break;
                            }
                            eventStartTime.adjust(1,0,0,0);
                            eventEndTime.adjust(1,0,0,0);
                        }

                        console.log(eventStartTime.toString());
                        console.log(eventEndTime.toString());

                        event.startDate = eventStartTime;
                        event.endDate = eventEndTime;
                    }
                    if (!meeting.building_tbd && !meeting.room_tbd) {
                        event.location = meeting.building + " " + meeting.room;
                    }
                    comp.addSubcomponent(vevent);
                }
            }
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
    text.html("To iCal");
    $(".myuw-search-links").prepend(newLink);
}); 
