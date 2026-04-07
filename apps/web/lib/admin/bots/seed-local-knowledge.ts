// ============================================================
// Local Knowledge Seeder
// Populates school_local_knowledge for top schools
// so bots can reference campus landmarks, traditions, bars, etc.
// ============================================================

import { createAdminClient } from '@/lib/admin/supabase/admin';

interface KnowledgeEntry {
  category: string;
  name: string;
  description: string;
}

// Hand-curated local knowledge for top 25 schools
// Each school gets landmarks, traditions, famous plays, local spots
const SCHOOL_KNOWLEDGE: Record<string, KnowledgeEntry[]> = {
  'Alabama': [
    { category: 'tradition', name: 'Walk of Champions', description: 'Pre-game walk past statues of national championship coaches' },
    { category: 'chant', name: 'Rammer Jammer', description: 'Victory chant sung after wins: Hey [opponent], we just beat the hell out of you' },
    { category: 'landmark', name: 'Bryant-Denny Stadium', description: '101,821-capacity stadium named for Bear Bryant and George Denny' },
    { category: 'restaurant', name: 'Dreamland BBQ', description: 'Famous ribs spot in Tuscaloosa, game day tradition since 1958' },
    { category: 'famous_play', name: 'The Kick Six', description: '2013 Iron Bowl, Chris Davis returns missed FG 109 yards to beat Alabama' },
    { category: 'nickname', name: 'The Process', description: 'Nick Saban\'s philosophy of focusing on the process, not the outcome' },
    { category: 'tradition', name: 'Elephant Walk', description: 'Seniors walk through campus on their last home game week' },
    { category: 'bar', name: 'Gallettes', description: 'Iconic dive bar on University Blvd, game day staple' },
  ],
  'Georgia': [
    { category: 'tradition', name: 'Between the Hedges', description: 'Playing at Sanford Stadium surrounded by the famous privet hedges' },
    { category: 'landmark', name: 'Sanford Stadium', description: '92,746-capacity stadium in Athens, home since 1929' },
    { category: 'famous_play', name: 'Run Lindsay Run', description: '1980 Buck Belue to Lindsay Scott play that sent UGA to the national championship' },
    { category: 'tradition', name: 'Uga the Bulldog', description: 'Live English Bulldog mascot, currently Uga XI' },
    { category: 'bar', name: 'The Arch downtown', description: 'Iconic gathering spot on Broad Street before games' },
    { category: 'chant', name: 'Glory Glory', description: 'Georgia fight song played after every score' },
    { category: 'restaurant', name: 'The Varsity', description: 'Famous hot dog and burger spot in Athens' },
  ],
  'Ohio State': [
    { category: 'tradition', name: 'Script Ohio', description: 'Marching band forms cursive Ohio, sousaphone player dots the i' },
    { category: 'tradition', name: 'The Shoe', description: 'Ohio Stadium aka The Horseshoe, 102,780 capacity' },
    { category: 'chant', name: 'O-H-I-O', description: 'Call and response chant that echoes across campus' },
    { category: 'tradition', name: 'Gold Pants', description: 'Gold charms given to players after beating Michigan' },
    { category: 'famous_play', name: '2002 National Championship', description: 'Double OT win over Miami in the Fiesta Bowl' },
    { category: 'bar', name: 'Skull Session', description: 'Pre-game concert at St. John Arena before every home game' },
    { category: 'nickname', name: 'THE Ohio State University', description: 'Emphatic use of THE before Ohio State' },
  ],
  'Michigan': [
    { category: 'landmark', name: 'The Big House', description: 'Michigan Stadium, largest stadium in the country at 107,601' },
    { category: 'tradition', name: 'Winged Helmet', description: 'Iconic maize and blue winged football helmet design' },
    { category: 'chant', name: 'The Victors', description: 'Fight song, considered one of the greatest in college football' },
    { category: 'tradition', name: 'Touching the Banner', description: 'Players touch the Go Blue banner running onto the field' },
    { category: 'famous_play', name: 'Desmond Howard Heisman Pose', description: '1991 Heisman pose in the end zone against Ohio State' },
    { category: 'restaurant', name: 'Zingerman\'s Deli', description: 'Ann Arbor institution, game day sandwich tradition' },
  ],
  'Texas': [
    { category: 'tradition', name: 'Hook em Horns', description: 'Iconic hand sign, index and pinky fingers extended' },
    { category: 'landmark', name: 'DKR Stadium', description: 'Darrell K Royal-Texas Memorial Stadium, 100,119 capacity' },
    { category: 'tradition', name: 'Bevo', description: 'Live Texas Longhorn steer mascot since 1916' },
    { category: 'chant', name: 'Texas Fight', description: 'Fight song played after every score' },
    { category: 'famous_play', name: 'Vince Young\'s Rose Bowl', description: '2005 national championship, VY runs it in against USC' },
    { category: 'bar', name: '6th Street', description: 'Austin\'s famous bar district, packed on game weekends' },
  ],
  'LSU': [
    { category: 'tradition', name: 'Saturday Night in Death Valley', description: 'Tiger Stadium at night, one of the loudest venues in sports' },
    { category: 'landmark', name: 'Tiger Stadium', description: '102,321-capacity Death Valley, rocks have been measured by seismographs' },
    { category: 'tradition', name: 'Mike the Tiger', description: 'Live Bengal tiger mascot, habitat next to the stadium' },
    { category: 'restaurant', name: 'Mike Anderson\'s', description: 'Baton Rouge seafood institution, crawfish game day tradition' },
    { category: 'chant', name: 'Tiger Rag', description: 'Hold That Tiger, played constantly during games' },
    { category: 'famous_play', name: 'Earthquake Game', description: '1988 vs Auburn, Tommy Hodson TD registers on seismograph' },
  ],
  'USC': [
    { category: 'tradition', name: 'Traveler', description: 'White horse mascot ridden by a Trojan warrior' },
    { category: 'landmark', name: 'LA Coliseum', description: 'Historic stadium, hosted two Olympics, 77,500 capacity' },
    { category: 'chant', name: 'Fight On', description: 'USC fight song, V-for-victory hand sign' },
    { category: 'tradition', name: 'Song Girls', description: 'Iconic dance and cheerleading squad' },
    { category: 'famous_play', name: 'Bush Push', description: '2005 Reggie Bush pushes Matt Leinart into end zone vs Notre Dame' },
  ],
  'Clemson': [
    { category: 'tradition', name: 'Running Down the Hill', description: 'Players touch Howard\'s Rock and run down the hill into Death Valley' },
    { category: 'landmark', name: 'Howard\'s Rock', description: 'Piece of Death Valley rock from California, players rub for luck' },
    { category: 'landmark', name: 'Memorial Stadium', description: '81,500-capacity Death Valley in Clemson, SC' },
    { category: 'tradition', name: 'Tiger Walk', description: 'Pre-game parade where players walk through fans to the stadium' },
    { category: 'famous_play', name: '2016 National Championship', description: 'Deshaun Watson to Hunter Renfrow, last-second TD to beat Alabama' },
  ],
  'Notre Dame': [
    { category: 'tradition', name: 'Touchdown Jesus', description: 'Word of Life mural on Hesburgh Library visible from the stadium' },
    { category: 'landmark', name: 'Notre Dame Stadium', description: 'The House That Rockne Built, 77,622 capacity' },
    { category: 'tradition', name: 'The Shirt', description: 'Annual student-designed game day shirt, different color each year' },
    { category: 'chant', name: 'Notre Dame Victory March', description: 'Considered the greatest fight song in college football' },
    { category: 'tradition', name: 'Play Like a Champion Today', description: 'Sign players tap leaving the locker room' },
    { category: 'famous_play', name: 'Rudy', description: '1975 Dan Ruettiger gets his sack in the final game of his career' },
  ],
  'Tennessee': [
    { category: 'tradition', name: 'Running Through the T', description: 'Players run through the Power T formed by the Pride of the Southland band' },
    { category: 'landmark', name: 'Neyland Stadium', description: '102,455 capacity, third largest in the US' },
    { category: 'tradition', name: 'Checker Neyland', description: 'Fans wear alternating orange and white by section to create a checkerboard' },
    { category: 'chant', name: 'Rocky Top', description: 'Iconic fight song played after scores, singalong tradition' },
    { category: 'restaurant', name: 'Vol Navy', description: 'Boats docked on the Tennessee River for river tailgating' },
  ],
  'Penn State': [
    { category: 'tradition', name: 'White Out', description: 'Entire stadium wears white for one big home game per year, 107,000 fans' },
    { category: 'landmark', name: 'Beaver Stadium', description: '106,572 capacity, second largest in the country' },
    { category: 'tradition', name: 'We Are... Penn State', description: 'Call and response chant, echoes through Happy Valley' },
    { category: 'tradition', name: 'The Creamery', description: 'Berkey Creamery ice cream, game day tradition' },
    { category: 'landmark', name: 'Happy Valley', description: 'Nickname for State College, PA' },
  ],
  'Oklahoma': [
    { category: 'tradition', name: 'Boomer Sooner', description: 'Fight song played after every score, repeated endlessly' },
    { category: 'tradition', name: 'Sooner Schooner', description: 'Covered wagon pulled by ponies Boomer and Sooner' },
    { category: 'landmark', name: 'Gaylord Family Stadium', description: '80,126 capacity in Norman, Oklahoma' },
    { category: 'famous_play', name: 'Red River Rivalry', description: 'Annual Texas vs Oklahoma game at the Cotton Bowl in Dallas' },
    { category: 'tradition', name: 'The Land Run', description: 'Pre-game celebration honoring Oklahoma\'s Land Run history' },
  ],
  'Auburn': [
    { category: 'tradition', name: 'Toomer\'s Corner', description: 'Rolling the oak trees with toilet paper after wins' },
    { category: 'landmark', name: 'Jordan-Hare Stadium', description: '87,451 capacity, home of the Tigers' },
    { category: 'chant', name: 'War Eagle', description: 'Battle cry of Auburn, golden eagle flies before home games' },
    { category: 'famous_play', name: 'Kick Six', description: 'Chris Davis 109-yard FG return to beat Alabama in 2013' },
    { category: 'famous_play', name: 'Prayer at Jordan-Hare', description: '2013 tipped pass caught by Ricardo Louis to beat Georgia' },
  ],
  'Florida': [
    { category: 'tradition', name: 'The Swamp', description: 'Ben Hill Griffin Stadium, known as one of the toughest environments' },
    { category: 'tradition', name: 'Gator Chomp', description: 'Arm motion mimicking alligator jaws' },
    { category: 'chant', name: 'We Are the Boys', description: 'Third quarter tradition, swaying and singing in the stands' },
    { category: 'landmark', name: 'Ben Hill Griffin Stadium', description: '88,548 capacity in Gainesville' },
    { category: 'famous_play', name: 'Tebow Promise', description: '2008 Tim Tebow\'s promise speech after loss to Ole Miss' },
  ],
  'Oregon': [
    { category: 'tradition', name: 'The O', description: 'Iconic O hand sign, Nike-designed everything' },
    { category: 'landmark', name: 'Autzen Stadium', description: '54,000 capacity but considered one of the loudest per-seat' },
    { category: 'tradition', name: 'New Uniforms Every Game', description: 'Nike partnership gives Oregon unique uniforms each week' },
    { category: 'tradition', name: 'Puddles', description: 'Donald Duck-like mascot, the Oregon Duck' },
  ],
  'Florida State': [
    { category: 'tradition', name: 'Osceola and Renegade', description: 'Student portraying Osceola plants a flaming spear at midfield' },
    { category: 'chant', name: 'War Chant', description: 'Tomahawk chop and war chant, one of the most recognizable in CFB' },
    { category: 'landmark', name: 'Doak Campbell Stadium', description: '79,560 capacity in Tallahassee' },
    { category: 'famous_play', name: 'Wide Right', description: 'Multiple Miami missed FGs in the rivalry' },
  ],
  'Texas A&M': [
    { category: 'tradition', name: 'The 12th Man', description: 'Students stand for the entire game as the 12th Man' },
    { category: 'tradition', name: 'Midnight Yell', description: 'Midnight pep rally before home games at Kyle Field' },
    { category: 'landmark', name: 'Kyle Field', description: '102,733 capacity, one of the largest in the country' },
    { category: 'tradition', name: 'Reveille', description: 'Rough Collie mascot, highest-ranking member of the Corps of Cadets' },
    { category: 'chant', name: 'Gig em Aggies', description: 'Thumbs up hand sign, Aggie battle cry' },
  ],
  'Wisconsin': [
    { category: 'tradition', name: 'Jump Around', description: 'Between third and fourth quarter, entire stadium jumps to House of Pain' },
    { category: 'landmark', name: 'Camp Randall Stadium', description: '80,321 capacity, built on a Civil War training camp' },
    { category: 'tradition', name: 'Fifth Quarter', description: 'Post-game party with the band playing Varsity and other songs' },
    { category: 'tradition', name: 'Bucky Badger', description: 'Mascot does push-ups after every touchdown' },
  ],
  'Ole Miss': [
    { category: 'tradition', name: 'The Grove', description: '10-acre tailgating paradise, tents and chandeliers under the oaks' },
    { category: 'landmark', name: 'Vaught-Hemingway Stadium', description: '64,038 capacity in Oxford, Mississippi' },
    { category: 'tradition', name: 'Hotty Toddy', description: 'Call and response cheer, Ole Miss battle cry' },
    { category: 'restaurant', name: 'The Square', description: 'Oxford\'s downtown square, bars and restaurants packed on game day' },
  ],
  'Iowa': [
    { category: 'tradition', name: 'The Wave', description: 'Fans wave to children in the University of Iowa Stead Family Children\'s Hospital' },
    { category: 'landmark', name: 'Kinnick Stadium', description: '69,250 capacity, named for Nile Kinnick' },
    { category: 'tradition', name: 'Swarm', description: 'Players touch the Tigerhawk on the way out of the tunnel' },
    { category: 'tradition', name: 'ANF (America Needs Farmers)', description: 'Gold ANF sticker on every helmet honoring Iowa farmers' },
  ],
  'Missouri': [
    { category: 'landmark', name: 'Faurot Field', description: 'Memorial Stadium, 71,168 capacity' },
    { category: 'tradition', name: 'Tiger Walk', description: 'Pre-game march from Traditions Plaza to the stadium' },
    { category: 'chant', name: 'M-I-Z, Z-O-U', description: 'Call and response cheer across the stadium' },
    { category: 'tradition', name: 'Truman the Tiger', description: 'Mascot named after Harry Truman, Missouri native' },
  ],
  'Washington': [
    { category: 'tradition', name: 'Sailgating', description: 'Fans arrive by boat on Lake Washington and Montlake Cut' },
    { category: 'landmark', name: 'Husky Stadium', description: '70,083 capacity with views of Lake Washington and the Cascades' },
    { category: 'tradition', name: 'Dawg Pack', description: 'Student section, one of the loudest in the Pac-12' },
  ],
  'Michigan State': [
    { category: 'tradition', name: 'Spartan March', description: 'Team walks from Kellogg Center to Spartan Stadium' },
    { category: 'landmark', name: 'Spartan Stadium', description: '75,005 capacity in East Lansing' },
    { category: 'famous_play', name: 'Trouble with the Snap', description: '2015 botched Michigan punt returned for MSU TD on last play' },
  ],
  'NC State': [
    { category: 'landmark', name: 'Carter-Finley Stadium', description: '57,583 capacity in Raleigh' },
    { category: 'tradition', name: 'Wolfpack', description: 'Wolf mascots Mr. and Mrs. Wuf' },
    { category: 'chant', name: 'Wolf howl', description: 'Fans howl after big plays' },
  ],
  'Oklahoma State': [
    { category: 'tradition', name: 'Paddle People', description: 'Fans with paddles in the stands' },
    { category: 'landmark', name: 'Boone Pickens Stadium', description: '55,509 capacity in Stillwater' },
    { category: 'tradition', name: 'Bullet', description: 'Black quarter horse that runs after every score' },
  ],
  'Mississippi State': [
    { category: 'tradition', name: 'Cowbells', description: 'Fans ring cowbells throughout the game, unique in college football' },
    { category: 'landmark', name: 'Davis Wade Stadium', description: '61,337 capacity in Starkville' },
    { category: 'tradition', name: 'Bully', description: 'English Bulldog mascot' },
  ],
};

/**
 * Seed local knowledge for schools that have entries defined.
 */
export async function seedLocalKnowledge(): Promise<{ inserted: number; errors: string[] }> {
  const supabase = createAdminClient();
  let inserted = 0;
  const errors: string[] = [];

  // Check if already seeded
  const { count } = await supabase
    .from('school_local_knowledge')
    .select('id', { count: 'exact', head: true });

  if ((count ?? 0) > 50) {
    return { inserted: 0, errors: ['Local knowledge already seeded'] };
  }

  // Fetch all schools
  const { data: schools } = await supabase
    .from('schools')
    .select('id, name')
    .eq('is_active', true);

  if (!schools?.length) return { inserted: 0, errors: ['No schools found'] };

  const schoolByName = new Map(schools.map(s => [s.name as string, s.id as string]));

  for (const [schoolName, entries] of Object.entries(SCHOOL_KNOWLEDGE)) {
    const schoolId = schoolByName.get(schoolName);
    if (!schoolId) {
      errors.push(`School not found: ${schoolName}`);
      continue;
    }

    for (const entry of entries) {
      const { error } = await supabase.from('school_local_knowledge').insert({
        school_id: schoolId,
        category: entry.category,
        name: entry.name,
        description: entry.description,
      });

      if (error) {
        errors.push(`${schoolName}/${entry.name}: ${error.message}`);
      } else {
        inserted++;
      }
    }
  }

  return { inserted, errors };
}
