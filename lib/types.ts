// 画面とAPIで共有する型

export type Precinct = {
  id: string;
  number: number;
  pollingPlaceName: string;
  areaTowns: string | null;
};

export type Election = {
  id: string;
  name: string;
  description: string | null;
  voteDate: string; // YYYY-MM-DD
  pledgeStartAt: string; // ISO 8601
  pledgeEndAt: string;
  reportStartAt: string;
  reportEndAt: string;
};

export type CurrentElectionResponse =
  | { election: null }
  | {
      election: Election;
      precincts: Precinct[];
      totals: { pledged: number; voted: number };
    };

export type Participation = {
  precinctId: string;
  pledgedAt: string | null;
  votedAt: string | null;
};

export type ParticipationResponse = { participation: Participation | null };

export type PrecinctStats = {
  precinctId: string;
  number: number;
  pollingPlaceName: string;
  eligibleVoters: number | null;
  officialTurnout: number | null; // %
  pledged: number;
  voted: number;
};

export type RankingResponse =
  | { election: null }
  | { election: Election; precincts: PrecinctStats[] };

export type ApiError ={ error: { code: string; message: string } };
