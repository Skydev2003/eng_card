import { oxfordPictures } from "./oxford-pictures.ts";

const sets = {
  people: {
    original: ["Doctor", "Firefighter", "Chef", "Artist", "Astronaut"],
    illustrated: ["Police officer", "Pilot", "Construction worker", "Soccer player", "Farmer", "Nurse", "Gardener", "Trumpeter", "Scientist", "Photographer", "Mechanic", "Dentist", "Lifeguard", "Violinist", "Librarian", "Archaeologist"],
  },
  animals: {
    original: ["Cat", "Dog", "Elephant", "Giraffe", "Penguin"],
    illustrated: ["Rabbit", "Duck", "Bear", "Wolf", "Tiger", "Zebra", "Monkey", "Horse", "Dolphin", "Kangaroo", "Raccoon", "Flamingo", "Chameleon", "Porcupine", "Octopus", "Platypus"],
  },
  objects: {
    original: ["Umbrella", "Scissors", "Bicycle", "Camera", "Backpack"],
    illustrated: ["Chair", "Table", "Pencil", "Notebook", "Clock", "Wristwatch", "Toothbrush", "Spoon", "Kettle", "Teapot", "Flashlight", "Binoculars", "Compass", "Hourglass", "Stapler", "Telescope"],
  },
  places: {
    original: ["Lighthouse", "Castle", "Hospital", "Windmill", "Airport"],
    illustrated: ["House", "School", "Park", "Beach", "Train station", "Market", "Bakery", "Museum", "Library", "Zoo", "Stadium", "Aquarium", "Observatory", "Greenhouse", "Amphitheater", "Harbor"],
  },
  food: {
    original: ["Apple", "Banana", "Pizza", "Pineapple", "Strawberry"],
    illustrated: ["Orange", "Cherries", "Grapes", "Watermelon", "Carrot", "Broccoli", "Toast", "Egg", "Cucumber", "Zucchini", "Croissant", "Pretzel", "Pomegranate", "Artichoke", "Blueberries", "Blackberries"],
  },
};

export type WordGroup = keyof typeof sets;
export type Difficulty = "easy" | "normal" | "hard";
type Tier = 1 | 2 | 3;
type Word = { group: WordGroup; word: string; tier: Tier; image: string; topic?: string };

const commonLegacy = new Set(["Doctor", "Chef", "Cat", "Dog", "Umbrella", "Bicycle", "Castle", "Hospital", "Apple", "Banana", "Pizza", "Backpack"]);
const specializedLegacy = new Set(["Lighthouse", "Windmill"]);

const illustratedWords = Object.entries(sets).flatMap(([key, group], row): Word[] => {
  const category = key as WordGroup;
  return [
    ...group.original.map((word, index): Word => ({
      group: category, word, tier: commonLegacy.has(word) ? 1 : specializedLegacy.has(word) ? 3 : 2,
      image: `/art/words/${row * 5 + index}.jpg`,
    })),
    ...group.illustrated.map((word, index): Word => ({
      group: category, word, tier: index < 4 ? 1 : index < 10 ? 2 : 3,
      image: `/art/words/${key}-${index + 1}.webp`,
    })),
  ];
});
export const vocabulary: Word[] = [
  ...illustratedWords,
  ...oxfordPictures.map(([group, topic, word, level, id]): Word => ({
    group, topic, word: word[0].toUpperCase() + word.slice(1),
    tier: level === "A1" ? 1 : level === "A2" ? 2 : 3,
    image: `/art/words/oxford/${id}.webp`,
  })),
];
export const WORD_COUNT = vocabulary.length;
const similar = [
  ["Doctor", "Nurse", "Dentist"], ["Farmer", "Gardener"], ["Trumpeter", "Violinist"],
  ["Scientist", "Archaeologist"], ["Construction worker", "Mechanic"],
  ["Dog", "Wolf", "Raccoon"], ["Dolphin", "Octopus", "Platypus"],
  ["Flamingo", "Penguin", "Duck"], ["Horse", "Zebra"], ["Kangaroo", "Rabbit"],
  ["Clock", "Wristwatch", "Hourglass"], ["Kettle", "Teapot"],
  ["Telescope", "Binoculars", "Compass"], ["Notebook", "Pencil", "Stapler"],
  ["Zoo", "Aquarium"], ["Stadium", "Amphitheater"], ["Lighthouse", "Windmill", "Observatory"],
  ["Airport", "Train station", "Harbor"], ["School", "Library", "Museum"],
  ["Cucumber", "Zucchini"], ["Blueberries", "Blackberries"], ["Pretzel", "Croissant", "Toast"],
  ["Watermelon", "Pomegranate"], ["Broccoli", "Artichoke"],
  ["Pilot", "Astronaut"], ["Police officer", "Firefighter"], ["Artist", "Photographer"],
  ["Bear", "Raccoon"], ["Giraffe", "Zebra"],
  ["Camera", "Binoculars", "Telescope"], ["Chair", "Table"], ["Scissors", "Stapler"],
  ["Park", "Zoo"], ["Bakery", "Market"], ["Park", "Greenhouse"],
  ["Grapes", "Cherries", "Blueberries", "Blackberries"], ["Orange", "Pomegranate"], ["Carrot", "Broccoli"],
  ["Catch", "Hold"], ["Office", "Library", "School"], ["Teacher", "Secretary", "Soldier"],
  ["Breakfast", "Lunch", "Dinner"], ["Screen", "Printer", "Laptop"],
];

const interchangeable = [
  ["Lorry", "Truck"], ["Aircraft", "Plane"], ["Screen", "Television"], ["Singer", "Musician"],
  ["Across", "Through"], ["Cupboard", "Drawer"], ["Salt", "Pepper"],
  ["Street", "Road"], ["Railway", "Track"], ["Sea", "Ocean"], ["Apartment", "Flat"],
  ["Harbor", "Harbour", "Port"], ["Ground", "Yard"], ["University", "College"],
  ["Alarm", "Clock"], ["Baseball", "Ball"], ["Signal", "Sign"], ["Stair", "Step"],
  ["Dirt", "Soil"], ["Drive", "Driving"], ["Cook", "Cooking"], ["Fly", "Flying"], ["Tyre", "Wheel"],
  ["Actor", "Actress"], ["Boy", "Child"], ["Girl", "Child"], ["Teenager", "Student", "Pupil"],
  ["Tourist", "Traveller", "Visitor", "Guest"], ["Painter", "Artist"], ["Journalist", "Reporter"],
  ["Airline", "Flight", "Aircraft"], ["Campus", "College", "University"], ["Lab", "Laboratory"],
  ["Sleep", "Asleep"], ["Fix", "Repair"], ["Laugh", "Happy"], ["Afraid", "Nervous", "Fear"],
  ["Injury", "Wound", "Pain"], ["Borrow", "Lend"], ["Buy", "Pay"], ["Race", "Racing"],
  ["Reward", "Prize", "Award"], ["Lesson", "Teaching", "Lecture", "Presentation"],
  ["Venue", "Location", "Destination"], ["Sea", "Ocean", "Wave"], ["Movie", "Film"],
  ["Photo", "Image", "Illustration"], ["Art", "Painting", "Drawing"], ["Audio", "Recording", "Podcast"],
  ["Internet", "Network", "Web"], ["Tiny", "Little", "Small"], ["Huge", "Large", "Big", "Giant"],
  ["Danger", "Warning", "Notice"], ["Land", "Ground", "Countryside"], ["Island", "Land"],
  ["Worker", "Builder"], ["Charity", "Donate", "Volunteer"], ["Hand", "Palm"], ["Organ", "Lung"],
];

const wordsByLabel = new Map(vocabulary.map((word) => [word.word, word]));
const obscuredChoices = new Map<string, Set<string>>();
for (const family of interchangeable) {
  for (const label of family) {
    const choices = obscuredChoices.get(label) ?? new Set<string>();
    for (const relative of family) choices.add(relative);
    obscuredChoices.set(label, choices);
  }
}
const pictureTopics = new Map<string, Word[]>();
function topicKey(word: Word) { return `${word.group}/${word.topic}`; }
for (const word of vocabulary) {
  if (word.topic === undefined) continue;
  const key = topicKey(word);
  const topic = pictureTopics.get(key) ?? [];
  topic.push(word);
  pictureTopics.set(key, topic);
}

function areDistinct(a: Word, b: Word) {
  return a.word !== b.word && !obscuredChoices.get(a.word)?.has(b.word);
}

export function wordsFor(category: WordGroup | "all", difficulty: Difficulty) {
  return vocabulary.filter((word) => {
    if (category !== "all" && word.group !== category) return false;
    if (difficulty === "easy") return word.tier === 1;
    if (difficulty === "hard") return word.tier >= 2 || word.topic !== undefined;
    return word.tier <= 2 || (word.topic !== undefined && closePictureOptions(word).length === 0);
  });
}

export function closePictureOptions(target: Word) {
  const candidates = new Set<Word>(target.topic === undefined ? [] : pictureTopics.get(topicKey(target)));
  for (const group of similar) {
    if (!group.includes(target.word)) continue;
    for (const label of group) {
      const word = wordsByLabel.get(label);
      if (word) candidates.add(word);
    }
  }
  return [...candidates].filter((word) => areDistinct(target, word));
}

export function distractorsFor(target: Word, difficulty: Difficulty) {
  if (difficulty === "easy") {
    return vocabulary.filter((word) => word.group !== target.group && word.tier === 1 && areDistinct(target, word));
  }
  if (difficulty === "hard") {
    const matches = closePictureOptions(target);
    if (matches.length) return matches;
  }
  return vocabulary.filter((word) => areDistinct(target, word) && word.group === target.group
    && (difficulty === "normal" ? word.tier <= 2 : word.tier >= 2));
}
