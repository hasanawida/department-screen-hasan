useEffect(() => {
  const channel = supabase
    .channel("emergency")
    .on("postgres_changes", {
      event: "UPDATE",
      schema: "public",
      table: "departments",
    }, (payload) => {
      // רענון מרחוק
      if (payload.new.force_refresh) {
        window.location.reload();
      }
      // הודעת חירום
      if (payload.new.emergency_active) {
        setEmergencyMessage(payload.new.emergency_message);
      } else {
        setEmergencyMessage(null);
      }
    })
    .subscribe();

  return () => supabase.removeChannel(channel);
}, []);