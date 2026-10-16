import { createVenue } from "@/app/actions";
import { Card, PageTitle, input, label, btnAccent } from "@/components/ui";

export default function NewVenuePage() {
  return (
    <div className="max-w-xl">
      <PageTitle eyebrow="Venues" title="Add a venue" />
      <Card>
        <form action={createVenue} className="space-y-4">
          <div>
            <label className={label} htmlFor="name">
              Venue name
            </label>
            <input id="name" name="name" required className={input} placeholder="The Grocery Music Hall" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label} htmlFor="city">
                City
              </label>
              <input id="city" name="city" className={input} placeholder="Harrisonburg, VA" />
            </div>
            <div>
              <label className={label} htmlFor="capacity">
                Capacity
              </label>
              <input id="capacity" name="capacity" type="number" min={1} defaultValue={300} className={input} />
            </div>
          </div>
          <button className={btnAccent}>Create and write the spec pack</button>
        </form>
      </Card>
    </div>
  );
}
