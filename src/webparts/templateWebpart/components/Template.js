export default `
<content type="x-inject">
  <script type="text/javascript" charset="utf-8" async>
    //alert('Jæddæ');
  </script>
</content>

<content type="x-inject">
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

<content type="x-setup">
  <script>
    console.log('Tjaaaaaa');
    x = 100;
  </script>
</content>

<content type="x-template">
  <div>
    Tralalalla
  </div>
</content>
`