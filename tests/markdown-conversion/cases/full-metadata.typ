#import "@local/armymemo:0.2.1": memo

#show: memo.with(
  office-symbol: "ATZB-CD-E",
  date: "1 August 2026",
  suspense: "15 August 2026",
  subject: "Exercising Every Front-Matter Field",
  organization: (
    name: "1st Training Battalion (Example)",
    street: "1234 Army Drive",
    city-state-zip: "Fort Liberty, NC 28310",
  ),
  author: (
    name: "Sarah M. Johnson",
    rank: "CPT",
    branch: "MI",
    title: "Company Commander",
  ),
  memo-for: (
    (
      name: "Commander, 2d Battalion",
      street: "5678 Army Drive",
      city-state-zip: "Fort Liberty, NC 28310",
    ),
    (
      name: "Commander, 3d Battalion",
    ),
  ),
  memo-thru: (
    (
      name: "Chief of Staff",
    ),
  ),
  authority: "AR 25-50",
  enclosures: ("Training Schedule", "Roster",),
  distribution: ("2d Battalion", "3d Battalion",),
  cf: ("G-3",),
  cf-without-encls: true,
)

1. This memo exercises every supported front-matter field plus the body constructs a memo needs: #strong[strong], #emph[emphasis], #raw("inline code"), and a #link("https://example.mil/policy")[reference].
2. A paragraph item with a nested breakdown:

   1. First sub-point of the breakdown.
   2. Second sub-point, with an unordered aside:

      - one aside
      - another aside
3. A multi-paragraph item.

   The second paragraph of the same numbered item continues here.
