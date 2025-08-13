import { ContactManager } from "@/components/contacts/ContactManager";

const Contacts = () => {
  return (
    <div className="min-h-screen bg-gradient-soft">
      <div className="container mx-auto p-6">
        <ContactManager />
      </div>
    </div>
  );
};

export default Contacts;