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
type Word = { group: WordGroup; word: string; tier: Tier; image: string };

const commonLegacy = new Set(["Doctor", "Chef", "Cat", "Dog", "Umbrella", "Bicycle", "Castle", "Hospital", "Apple", "Banana", "Pizza", "Backpack"]);
const specializedLegacy = new Set(["Lighthouse", "Windmill"]);

export const vocabulary = Object.entries(sets).flatMap(([key, group], row): Word[] => {
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
];

export function wordsFor(category: WordGroup | "all", difficulty: Difficulty) {
  return vocabulary.filter((word) => (category === "all" || word.group === category)
    && (difficulty === "easy" ? word.tier === 1 : difficulty === "normal" ? word.tier <= 2 : word.tier >= 2));
}

export function distractorsFor(target: Word, difficulty: Difficulty) {
  if (difficulty === "easy") {
    return vocabulary.filter((word) => word.group !== target.group && word.tier === 1);
  }
  if (difficulty === "hard") {
    const neighbors = new Set(similar.filter((group) => group.includes(target.word)).flat());
    const matches = vocabulary.filter((word) => word.word !== target.word && neighbors.has(word.word));
    if (matches.length) return matches;
  }
  return vocabulary.filter((word) => word.word !== target.word && word.group === target.group
    && (difficulty === "normal" ? word.tier <= 2 : word.tier >= 2));
}
