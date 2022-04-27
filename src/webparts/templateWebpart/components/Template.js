export default `
<content type="x-head">
  <script type="text/javascript" charset="utf-8" async>
    //alert('Jæddæ');
  </script>
</content>

<content type="x-head">
<script>
//begin main function
/*$(document).ready(function () {
  if ($("div.valo-events .tabs-nav li.active").length === 0) {
    $('.tabs-nav li:first-child').addClass('active');
  }

  $('.tabs-nav a').click(function (ev) {
    ev.preventDefault();
    // Check for active
    $('.tabs-nav li').removeClass('active');
    $(this).parent().addClass('active');

    // Display active tab
    let currentTab = $(this).attr('href');
    $('.tabs-content>div').hide();
    $(currentTab).show();
    console.log(currentTab);
    return false;
  });
  $('div.items a').click(function (e) {
    window.open($(this).attr('href'), '_blank');
    e.preventDefault();
  })
  $('.items').click(function () {
    if($(this).data('calendar-type') === "Personlig") window.open($(this).data('href'), '_blank');
  })

  function removeEndedEvents() {
    let now = new Date();
    let events = $("div.calendar-events");
    $.each(events, function (i, event) {
      let end = new Date($(event).data('event-end'));
      if (end < now) {
        console.log("Removed ended event", $(event).data('event-title'), 'ended at', $(event).data(
          'event-end'));
        $(event).remove();
      }
    })
  }

  setInterval(removeEndedEvents, 10000);
  removeEndedEvents();
});*/
</script>
</content>

<content type="x-inject">
  <script>
  Handlebars.registerHelper('customlog', function (dsData) {
    console.log('dsdata', dsData);
  });

  Handlebars.registerHelper('concat', function (firstpart, secondpart) {
    return firstpart + secondpart;
  });

  Handlebars.registerHelper('print_id', function (tabName = "") {
    return tabName.split(" ").join("");
  });

  Handlebars.registerHelper('removeDottAsync', async function (textPromise) {
    const text = await textPromise
    return text.replace(".", "");
  });

  Handlebars.registerHelper('subtractDays', function (dateString, days) {
    const date = new Date(dateString)
    const subtracted = date.getTime() - (1000 * 3600 * 24 * days)
    return (new Date(subtracted)).toISOString()
  });

  Handlebars.registerHelper('dateDiff', function (startDate, endDate) {
    const diff = (new Date(endDate)) - (new Date(startDate));
    const daysDifference = diff / (1000 * 3600 * 24)

    // Return diff in days
    return daysDifference;
  });

  Handlebars.registerHelper('meetingTimeDays', function (startDate, endDate) {
    const diff = (new Date(endDate)) - (new Date(startDate));
    const days = Math.floor(diff / (1000 * 3600 * 24))

    if (days === 1) return "Hele dagen"
    return days + ' hele dager'
  });

  Handlebars.registerHelper('cond', function (v1, operator, v2) {
    if (operator === '==') {
      return (v1 == v2);
    } else if (operator === '===') {
      return (v1 === v2);
    } else if (operator === '!=') {
      return (v1 != v2);
    } else if (operator === '!==') {
      return (v1 !== v2);
    } else if (operator === '<') {
      return (v1 < v2);
    } else if (operator === '<=') {
      return (v1 <= v2);
    } else if (operator === '>') {
      return (v1 > v2);
    } else if (operator === '>=') {
      return (v1 >= v2);
    } else if (operator === '&&') {
      return (v1 && v2);
    } else if (operator === '||') {
      return (v1 || v2);
    }
  });
  </script>
</content>

<content type="x-template">
  <div>
    Tralalalla
  </div>
</content>
`